(function() {
  // As soon as possible, find the <script> that NotificationMonitor is going to parse.
  // Then force 'tierStatus' to be "TIER2" (Gold tier).
  // You may need to adjust the selector depending on your environment.
  document.addEventListener("DOMContentLoaded", function() {
    const scriptTag = document.querySelector(
      `script[data-a-state='{"key":"vvp-context"}']`
    );
    if (!scriptTag || !scriptTag.innerHTML) {
      return;
    }
    
    try {
      // Parse the JSON inside the <script> tag
      const data = JSON.parse(scriptTag.innerHTML);
      // Force tierStatus to TIER2
      if (data?.voiceDetails) {
        data.voiceDetails.tierStatus = "TIER2";
      }
      // Overwrite the original script text with our faked data
      scriptTag.innerHTML = JSON.stringify(data);
    } catch (err) {
      // If something goes wrong, fail silently
      console.warn("ForceGold.js error:", err);
    }
  });
})();

