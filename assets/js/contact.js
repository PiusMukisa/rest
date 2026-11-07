(function () {
  const form = document.getElementById("contact-form");
  if (!form) return;

  const status = document.getElementById("contact-status");
  const submitButton = form.querySelector('button[type="submit"]');

  function showStatus(message, isError) {
    status.replaceChildren();
    status.textContent = message;
    status.dataset.error = String(isError);
  }

  function offerEmailDraft(message, explanation) {
    const subject = message.subject
      ? `Website message: ${message.subject}`
      : "Website message for Rest Church Ministries";
    const body = [
      `Name: ${message.sender_name}`,
      `Email: ${message.email}`,
      `Subject: ${message.subject || "(not provided)"}`,
      "",
      "Message:",
      message.message
    ].join("\n");
    const mailto = `mailto:restchurh37@gmail.com?${new URLSearchParams({
      subject,
      body
    })}`;
    const gmail = `https://mail.google.com/mail/?${new URLSearchParams({
      view: "cm",
      fs: "1",
      to: "restchurh37@gmail.com",
      su: subject,
      body
    })}`;

    showStatus("", true);
    status.append(document.createTextNode(
      `${explanation} The email has not been sent until you press Send in your email app. `
    ));

    const emailLink = document.createElement("a");
    emailLink.href = mailto;
    emailLink.textContent = "Open email app";
    status.append(emailLink, document.createTextNode(" · "));

    const gmailLink = document.createElement("a");
    gmailLink.href = gmail;
    gmailLink.target = "_blank";
    gmailLink.rel = "noopener noreferrer";
    gmailLink.textContent = "Open Gmail";
    status.append(gmailLink);

    window.location.href = mailto;
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    showStatus("", false);

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

    let client;
    try {
      client = window.getRestChurchClient();
    } catch (error) {
      console.error("Could not initialize the contact form database client.", error);
      offerEmailDraft(message, "The website message service is unavailable.");
      return;
    }
    if (!client) {
      offerEmailDraft(message, "The online message service is not configured yet.");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
    try {
      const { data, error } = await client.functions.invoke("send-contact-message", {
        body: message
      });
      if (error) {
        let deliveryError = "The website could not deliver your message.";
        if (error.context instanceof Response) {
          try {
            const response = await error.context.clone().json();
            if (typeof response.error === "string") deliveryError = response.error;
          } catch {
            console.error("Could not read the contact email delivery error response.");
          }
        }
        console.error("Could not deliver contact message.", error.message);
        offerEmailDraft(message, `${deliveryError} You can email the church directly instead.`);
        return;
      }
      if (data?.saved !== true) {
        console.error("The contact-message service returned an unexpected response.", data);
        offerEmailDraft(message, "The website could not confirm delivery of your message.");
        return;
      }

      if (data.email_sent === true) {
        form.reset();
        showStatus("Your message was sent to the church inbox and saved for follow-up.", false);
      } else {
        offerEmailDraft(
          message,
          data.saved === true
            ? "Your message was saved on the website, but was not emailed to the church."
            : data.message || "The website could not email the church."
        );
      }
    } catch (error) {
      console.error("Could not send contact message.", error);
      offerEmailDraft(message, "The website message service is unavailable.");
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = 'Send message <span aria-hidden="true">↗</span>';
    }
  });
})();
