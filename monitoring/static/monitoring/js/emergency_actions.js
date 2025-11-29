// monitoring/static/monitoring/js/emergency_actions.js

// Global object where we store the primary emergency contact
let PRIMARY_CONTACT = null;

// 1. Load the first emergency contact from your Django API
function loadPrimaryContact() {
  return apiGet('/api/contacts/').then(data => {
    if (data.contacts && data.contacts.length > 0) {
      // Take the first contact in the list as the primary contact
      PRIMARY_CONTACT = data.contacts[0];
      console.log('Primary emergency contact:', PRIMARY_CONTACT);
    } else {
      console.warn('No emergency contacts configured!');
      PRIMARY_CONTACT = null;
    }
  }).catch(err => {
    console.error('Failed to load contacts', err);
    PRIMARY_CONTACT = null;
  });
}

// 2. Build a nice emergency message with Google Maps link
function buildEmergencyMessage(lat, lng) {
  const mapsUrl = (lat && lng)
    ? `https://maps.google.com/?q=${lat},${lng}`
    : 'Location not available';

  return `⚠️ EMERGENCY ALERT: Possible fall detected.\n\n` +
         `Location: ${mapsUrl}\n\n` +
         `This message was sent automatically from the Health Fall Detection system.`;
}

// 3. Open SMS app with message pre-filled
function openSmsWithLocation(phone, lat, lng) {
  if (!phone) {
    alert('No emergency phone number found. Please add a contact first.');
    return;
  }

  const body = encodeURIComponent(buildEmergencyMessage(lat, lng));

  // Most Android & iOS browsers support this pattern
  const smsUrl = `sms:${phone}?&body=${body}`;
  window.location.href = smsUrl;  // opens SMS app
}

// 4. Open dialer with phone number
function openCall(phone) {
  if (!phone) {
    alert('No emergency phone number found. Please add a contact first.');
    return;
  }
  const telUrl = `tel:${phone}`;
  window.location.href = telUrl;  // opens dialer
}

// 5. Main function you will call when countdown finishes
//    lat / lng should come from your anomaly detection code.
function triggerEmergencyActions(lat, lng) {
  if (!PRIMARY_CONTACT) {
    console.warn('PRIMARY_CONTACT not loaded yet, trying to fetch now...');
    loadPrimaryContact().then(() => {
      if (!PRIMARY_CONTACT) {
        alert('No emergency contacts available to notify.');
        return;
      }
      doActions(lat, lng);
    });
  } else {
    doActions(lat, lng);
  }
}

// Helper: perform SMS + Call
function doActions(lat, lng) {
  const phone = PRIMARY_CONTACT.phone;

  // 1) Open SMS with GPS link
  openSmsWithLocation(phone, lat, lng);

  // 2) Optionally also open dialer AFTER a short delay
  //    (browsers don’t like opening two things at once)
  setTimeout(() => {
    openCall(phone);
  }, 1500);  // 1.5 seconds after SMS app is triggered
}

// Automatically load contact when any page using this script loads
document.addEventListener('DOMContentLoaded', () => {
  loadPrimaryContact();
});

// Expose triggerEmergencyActions globally so other scripts can call it
window.triggerEmergencyActions = triggerEmergencyActions;
