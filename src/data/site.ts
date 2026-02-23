export const site = {
  name: "Velora HealthConnect",
  tagline: "Trusted guidance and proper follow-up care",
  url: "https://velorahealthconnect.com.au",

  business: {
    legalName: "Velora HealthConnect",
    abn: "",
    acn: "",
  },

  contact: {
    email: "hello@velorahealthconnect.com.au",
    emailAppointments: "appointments@velorahealthconnect.com.au",
    emailSupport: "support@velorahealthconnect.com.au",
    phone: "+61 1300 835 672",
    phoneDisplay: "1300 VELORA (1300 835 672)",
  },

  address: {
    street: "",
    suburb: "",
    state: "",
    postcode: "",
    country: "Australia",
    get full() {
      return `${this.street}, ${this.suburb} ${this.state} ${this.postcode}`;
    },
  },

  social: {
    instagram: "#",
    facebook: "#",
    twitter: "#",
    linkedin: "#",
  },

  seo: {
    defaultDescription:
      "Velora HealthConnect provides trusted telehealth guidance for weight loss, peptide therapy, and medical cannabis across Australia. Expert consultations with proper follow-up care.",
    ogImage: "/og-image.jpg",
  },
} as const;
