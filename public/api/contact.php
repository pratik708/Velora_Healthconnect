<?php
/**
 * Contact Form Handler — AWS SES SMTP
 *
 * Receives form submissions, validates spam prevention,
 * sanitises input, and sends via AWS SES.
 *
 * Credentials are loaded from environment variables.
 * See .env.example for required vars.
 */

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

// Load .env if environment vars aren't set (shared hosting fallback)
if (empty(getenv('SES_SMTP_USER'))) {
    $envPaths = [
        __DIR__ . '/../../.env',
        dirname(__DIR__, 2) . '/.env',
    ];
    foreach ($envPaths as $envPath) {
        if (file_exists($envPath)) {
            $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($lines === false) continue;
            foreach ($lines as $line) {
                if (str_starts_with(trim($line), '#')) continue;
                if (str_contains($line, '=')) {
                    [$key, $value] = explode('=', $line, 2);
                    $key = trim($key);
                    $value = trim($value);
                    if (!empty($key)) {
                        putenv("{$key}={$value}");
                        $_ENV[$key] = $value;
                    }
                }
            }
            break;
        }
    }
}

$config = [
    'smtp_host' => getenv('SES_SMTP_HOST') ?: 'email-smtp.ap-southeast-2.amazonaws.com',
    'smtp_port' => 587,
    'smtp_user' => getenv('SES_SMTP_USER') ?: '',
    'smtp_pass' => getenv('SES_SMTP_PASS') ?: '',
    'from_email' => getenv('MAIL_FROM_EMAIL') ?: 'noreply@emails.au',
    'from_name'  => getenv('MAIL_FROM_NAME') ?: 'Website',
    'to_email'   => getenv('MAIL_TO_EMAIL') ?: '',
    'to_name'    => getenv('MAIL_TO_NAME') ?: '',
];

// =============================================================================
// AWS SES SMTP PASSWORD CONVERSION
// Converts IAM Secret Key → SES SMTP Password
// =============================================================================

function convertIamToSmtpPassword(string $secretKey, string $region = 'ap-southeast-2'): string {
    $date = '11111111';
    $service = 'ses';
    $terminal = 'aws4_request';
    $message = 'SendRawEmail';
    $version = "\x04";

    $signature = hash_hmac('sha256', $date, 'AWS4' . $secretKey, true);
    $signature = hash_hmac('sha256', $region, $signature, true);
    $signature = hash_hmac('sha256', $service, $signature, true);
    $signature = hash_hmac('sha256', $terminal, $signature, true);
    $signature = hash_hmac('sha256', $message, $signature, true);

    return base64_encode($version . $signature);
}

if (!empty($config['smtp_pass']) && strlen($config['smtp_pass']) <= 41) {
    $region = 'ap-southeast-2';
    if (preg_match('/email-smtp\.([a-z0-9-]+)\.amazonaws\.com/', $config['smtp_host'], $matches)) {
        $region = $matches[1];
    }
    $config['smtp_pass'] = convertIamToSmtpPassword($config['smtp_pass'], $region);
}

if (empty($config['smtp_user']) || empty($config['smtp_pass'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Mail configuration error']);
    error_log('SES SMTP credentials not configured');
    exit;
}

if (empty($config['to_email'])) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Mail configuration error']);
    error_log('MAIL_TO_EMAIL not configured');
    exit;
}

// =============================================================================
// SPAM PROTECTION
// =============================================================================

// 1. Honeypot
if (!empty($_POST['company_url'])) {
    echo json_encode(['success' => true, 'message' => 'Thank you for your message.']);
    exit;
}

// 2. Token validation — must match client-side generateFormToken()
function generateToken(int $timestamp): string {
    $salt = 'starter_form_2025';
    $data = "{$timestamp}_{$salt}";
    $hash = 0;
    for ($i = 0; $i < strlen($data); $i++) {
        $char = ord($data[$i]);
        $hash = (($hash << 5) - $hash) + $char;
        $hash = $hash & 0xFFFFFFFF;
        if ($hash > 0x7FFFFFFF) $hash -= 0x100000000;
    }
    $base = base_convert((string) abs($hash), 10, 36);
    $check = base_convert((string) ($timestamp % 9973), 10, 36);
    return "{$base}_{$check}";
}

$submittedToken = $_POST['_token'] ?? '';
$submittedTimestamp = isset($_POST['_ts']) ? (int) $_POST['_ts'] : 0;
$currentTime = time();

if (empty($submittedToken) || empty($submittedTimestamp)) {
    echo json_encode(['success' => true, 'message' => 'Thank you for your message.']);
    exit;
}

if ($submittedToken !== generateToken($submittedTimestamp)) {
    echo json_encode(['success' => true, 'message' => 'Thank you for your message.']);
    exit;
}

$elapsed = $currentTime - $submittedTimestamp;
if ($elapsed < 3 || $elapsed > 3600) {
    echo json_encode(['success' => true, 'message' => 'Thank you for your message.']);
    exit;
}

// =============================================================================
// COLLECT & VALIDATE FIELDS
// =============================================================================

$fields = [
    'name'    => (string) (filter_input(INPUT_POST, 'name', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'email'   => (string) (filter_input(INPUT_POST, 'email', FILTER_SANITIZE_EMAIL) ?? ''),
    'phone'   => (string) (filter_input(INPUT_POST, 'phone', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'message' => (string) (filter_input(INPUT_POST, 'message', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'source'  => (string) (filter_input(INPUT_POST, '_source', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '') ?: '/unknown',
];

$utmFields = [
    'utm_source'   => (string) (filter_input(INPUT_POST, 'utm_source', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'utm_medium'   => (string) (filter_input(INPUT_POST, 'utm_medium', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'utm_campaign' => (string) (filter_input(INPUT_POST, 'utm_campaign', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'utm_term'     => (string) (filter_input(INPUT_POST, 'utm_term', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'utm_content'  => (string) (filter_input(INPUT_POST, 'utm_content', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'gclid'        => (string) (filter_input(INPUT_POST, 'gclid', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
    'fbclid'       => (string) (filter_input(INPUT_POST, 'fbclid', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? ''),
];

$landingPage = (string) (filter_input(INPUT_POST, '_landing_page', FILTER_SANITIZE_FULL_SPECIAL_CHARS) ?? '');

if (empty($fields['name'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Name is required']);
    exit;
}

if (empty($fields['email']) || !filter_var($fields['email'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valid email is required']);
    exit;
}

if (empty($fields['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Message is required']);
    exit;
}

// =============================================================================
// BUILD EMAIL
// =============================================================================

$nameDisplay = htmlspecialchars($fields['name']);
$emailDisplay = htmlspecialchars($fields['email']);
$phoneDisplay = htmlspecialchars($fields['phone']);
$messageDisplay = nl2br(htmlspecialchars($fields['message']));
$subject = "[Lead] Contact Form - {$fields['name']}";
$timestamp = date('j M Y \a\t g:i A T');

// Contact info rows
$contactRows = "
<tr><td style='padding:8px 12px;color:#6B7280;font-size:14px;width:120px;'>Name</td>
    <td style='padding:8px 12px;font-weight:600;'>{$nameDisplay}</td></tr>
<tr><td style='padding:8px 12px;color:#6B7280;font-size:14px;'>Email</td>
    <td style='padding:8px 12px;'><a href='mailto:{$emailDisplay}' style='color:#0052CC;text-decoration:none;'>{$emailDisplay}</a></td></tr>";

if (!empty($fields['phone'])) {
    $phoneLink = preg_replace('/[^0-9+]/', '', $fields['phone']);
    $contactRows .= "
<tr><td style='padding:8px 12px;color:#6B7280;font-size:14px;'>Phone</td>
    <td style='padding:8px 12px;'><a href='tel:{$phoneLink}' style='color:#0052CC;text-decoration:none;'>{$phoneDisplay}</a></td></tr>";
}

// UTM rows
$utmHtml = '';
$hasUtm = false;
foreach ($utmFields as $key => $value) {
    if (!empty($value)) {
        $hasUtm = true;
        $label = strtoupper(str_replace('_', ' ', $key));
        $safeValue = htmlspecialchars($value);
        $utmHtml .= "<tr><td style='padding:4px 8px;color:#9CA3AF;font-size:12px;'>{$label}</td>
                         <td style='padding:4px 8px;color:#6B7280;font-size:12px;'>{$safeValue}</td></tr>";
    }
}

$htmlBody = "
<!DOCTYPE html>
<html>
<head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'></head>
<body style='margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;'>
<table width='100%' cellpadding='0' cellspacing='0' style='background:#F3F4F6;padding:32px 16px;'>
<tr><td align='center'>
<table width='600' cellpadding='0' cellspacing='0' style='max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;'>

<!-- Header -->
<tr><td style='padding:32px 32px 24px;border-bottom:1px solid #E5E7EB;'>
    <table width='100%' cellpadding='0' cellspacing='0'>
    <tr>
        <td>
            <p style='margin:0 0 4px;font-size:13px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;'>New Lead</p>
            <h1 style='margin:0;font-size:20px;color:#111827;font-weight:600;'>Contact Form</h1>
        </td>
        <td align='right' style='vertical-align:top;'>
            <span style='font-size:13px;color:#6B7280;'>" . date('j M Y') . "</span>
        </td>
    </tr>
    </table>
</td></tr>

<!-- Content -->
<tr><td style='padding:24px 32px;'>
    <h2 style='margin:0 0 16px;font-size:14px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;'>Contact Details</h2>
    <table width='100%' cellpadding='0' cellspacing='0' style='background:#F9FAFB;border-radius:8px;margin-bottom:24px;'>
        {$contactRows}
    </table>

    <h2 style='margin:0 0 12px;font-size:14px;color:#6B7280;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;'>Message</h2>
    <div style='background:#F9FAFB;border-left:4px solid #0052CC;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;'>
        <p style='margin:0;color:#374151;line-height:1.6;'>{$messageDisplay}</p>
    </div>

    <table width='100%' cellpadding='0' cellspacing='0' style='margin-top:24px;'>
    <tr><td align='center'>
        <a href='mailto:{$emailDisplay}' style='display:inline-block;background:#0052CC;color:#FFFFFF;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;margin-right:8px;'>Reply to Lead</a>";

if (!empty($fields['phone'])) {
    $phoneLink = preg_replace('/[^0-9+]/', '', $fields['phone']);
    $htmlBody .= "
        <a href='tel:{$phoneLink}' style='display:inline-block;background:#FFFFFF;color:#0052CC;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;font-size:14px;border:1px solid #0052CC;'>Call Now</a>";
}

$htmlBody .= "
    </td></tr>
    </table>
</td></tr>

<!-- Footer -->
<tr><td style='background:#F9FAFB;padding:24px 32px;border-top:1px solid #E5E7EB;'>
    <table width='100%' cellpadding='0' cellspacing='0'>
    <tr>
        <td>
            <p style='margin:0 0 4px;font-size:12px;color:#9CA3AF;'>Submitted from</p>
            <p style='margin:0;font-size:13px;color:#4B5563;'>{$fields['source']}</p>
        </td>
        <td align='right'>
            <p style='margin:0;font-size:12px;color:#9CA3AF;'>{$timestamp}</p>
        </td>
    </tr>";

if ($hasUtm) {
    $htmlBody .= "
    <tr><td colspan='2' style='padding-top:16px;'>
        <p style='margin:0 0 8px;font-size:11px;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.5px;'>Attribution Data</p>
        <table cellpadding='0' cellspacing='0' style='font-size:12px;'>{$utmHtml}</table>
    </td></tr>";
}

if (!empty($landingPage) && $landingPage !== $fields['source']) {
    $safeLanding = htmlspecialchars($landingPage);
    $htmlBody .= "
    <tr><td colspan='2' style='padding-top:12px;'>
        <p style='margin:0;font-size:12px;color:#9CA3AF;'>Landing page: <span style='color:#6B7280;'>{$safeLanding}</span></p>
    </td></tr>";
}

$htmlBody .= "
    </table>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>";

// Plain text fallback
$textBody = "CONTACT FORM\n" . str_repeat('=', 40) . "\n\n";
$textBody .= "Name: {$fields['name']}\n";
$textBody .= "Email: {$fields['email']}\n";
if (!empty($fields['phone'])) $textBody .= "Phone: {$fields['phone']}\n";
$textBody .= "\nMESSAGE\n{$fields['message']}\n";

if ($hasUtm) {
    $textBody .= "\nATTRIBUTION\n";
    foreach ($utmFields as $key => $value) {
        if (!empty($value)) {
            $textBody .= strtoupper(str_replace('_', ' ', $key)) . ": {$value}\n";
        }
    }
}

$textBody .= "\n" . str_repeat('-', 40) . "\n";
$textBody .= "Source: {$fields['source']}\n";
$textBody .= "Submitted: {$timestamp}\n";

// =============================================================================
// SEND EMAIL
// =============================================================================

require_once __DIR__ . '/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/PHPMailer/SMTP.php';
require_once __DIR__ . '/PHPMailer/Exception.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

try {
    $mail = new PHPMailer(true);

    $mail->isSMTP();
    $mail->Host       = $config['smtp_host'];
    $mail->SMTPAuth   = true;
    $mail->Username   = $config['smtp_user'];
    $mail->Password   = $config['smtp_pass'];
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = $config['smtp_port'];

    $mail->setFrom($config['from_email'], $config['from_name']);
    $mail->addAddress($config['to_email'], $config['to_name']);
    $mail->addReplyTo($fields['email'], $fields['name']);

    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body    = $htmlBody;
    $mail->AltBody = $textBody;

    $mail->send();

    echo json_encode([
        'success' => true,
        'message' => 'Thank you for your message. We\'ll be in touch soon.'
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Sorry, there was an error sending your message. Please try again or call us directly.'
    ]);
    error_log('Mail error: ' . (isset($mail) ? $mail->ErrorInfo : $e->getMessage()));
}
