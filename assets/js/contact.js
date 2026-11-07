(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-status");
  const submitButton = form.querySelector('button[type="submit"]');

  function showStatus(message, isError) {
    status.textContent = message;
    status.dataset.error = String(isError);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    showStatus("", false);

    let client;
    try {
      client = window.getRestChurchClient();
    } catch (error) {
      showStatus("The message service could not be initialized. Please try again later.", true);
      console.error("Could not initialize the contact form database client.", error);
      return;
    }
    if (!client) {
      showStatus("The message form is not configured yet. Please contact the church directly.", true);
      return;
    }

    const fields = new FormData(form);
    const message = {
      sender_name: String(fields.get("name") || "").trim(),
      email: String(fields.get("email") || "").trim(),
      subject: String(fields.get("subject") || "").trim() || null,
      message: String(fields.get("message") || "").trim()
    };

    if (!message.sender_name || !message.email || !message.message) {
      showStatus("Please complete your name, email address, and message.", true);
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    try {
      const { data, error } = await client.functions.invoke("send-contact-message", {
        body: message
      });
      if (error) {
        let deliveryError = "Your message could not be sent. Please email or call the church directly, or try again later.";
        if (error.context instanceof Response) {
          try {
            const response = await error.context.clone().json();
            if (typeof response.error === "string") deliveryError = response.error;
          } catch {
            console.error("Could not read the contact email delivery error response.");
          }
        }
        showStatus(deliveryError, true);
        console.error("Could not deliver contact message.", error.message);
        return;
      }
      if (data?.saved !== true) {
        showStatus("The message service could not confirm that your message was saved. Please email or call the church directly.", true);
        console.error("The contact-message service returned an unexpected response.", data);
        return;
      }

      form.reset();
      if (data.email_sent === true) {
        showStatus("Your message was sent to the church inbox and saved for follow-up.", false);
      } else {
        showStatus(data.message || "Your message was saved, but the church email notification could not be confirmed. Please email or call the church directly.", true);
      }
    } catch (error) {
      showStatus("Your message could not be sent. Please check your connection and try again.", true);
      console.error("Could not send contact message.", error);
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send message <span aria-hidden="true">↗</span>';
    }
  });
})();
