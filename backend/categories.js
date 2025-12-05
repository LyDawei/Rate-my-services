/**
 * Baymax Care Categories
 * "I cannot deactivate until you say you are satisfied with your care."
 */

const CATEGORIES = {
  emergency_response: {
    id: "emergency_response",
    name: "Emergency Response",
    emoji: "🚨",
    description: "When systems were critical and immediate care was required"
  },
  computer_diagnostics: {
    id: "computer_diagnostics",
    name: "Computer Diagnostics",
    emoji: "🔍",
    description: "Scanning for technical ailments and prescribing solutions"
  },
  password_recovery: {
    id: "password_recovery",
    name: "Password Recovery",
    emoji: "🔑",
    description: "Restoring access to forgotten credentials"
  },
  printer_rehabilitation: {
    id: "printer_rehabilitation",
    name: "Printer Rehabilitation",
    emoji: "🖨️",
    description: "Physical therapy for paper-handling devices"
  },
  email_treatment: {
    id: "email_treatment",
    name: "Email Treatment",
    emoji: "💌",
    description: "Treating communication disorders and inbox ailments"
  },
  network_recovery: {
    id: "network_recovery",
    name: "Network Recovery",
    emoji: "📡",
    description: "Restoring connectivity and treating wireless conditions"
  },
  device_setup: {
    id: "device_setup",
    name: "Device Setup",
    emoji: "📱",
    description: "New patient onboarding and device configuration"
  },
  major_procedure: {
    id: "major_procedure",
    name: "Major Procedure",
    emoji: "🏥",
    description: "Complex IT operations requiring extended care"
  },
  general_checkup: {
    id: "general_checkup",
    name: "General Checkup",
    emoji: "💊",
    description: "Routine maintenance and preventive care"
  }
};

module.exports = CATEGORIES;
