(function () {
  const loginPanel = document.getElementById("admin-login");
  const dashboard = document.getElementById("admin-dashboard");
  const loginForm = document.getElementById("login-form");
  const loginStatus = document.getElementById("login-status");
  const dashboardStatus = document.getElementById("dashboard-status");
  const imageFields = [
    ["logo_path", "Church logo"],
    ["home_pastor_image", "Home page pastor photo"],
    ["home_mission_image", "Home page mission photo"],
    ["home_gallery_outreach_image", "Home page outreach photo"],
    ["home_gallery_care_image", "Home page community care photo"],
    ["home_gallery_baptism_image", "Home page baptism photo"],
    ["home_gallery_children_image", "Home page children’s ministry photo"],
    ["about_evangelism_image", "About page evangelism photo"],
    ["about_outreach_image", "About page outreach photo"],
    ["about_fellowship_image", "About page fellowship photo"],
    ["about_faith_image", "About page faith photo"],
    ["about_pastor_image", "About page pastor photo"]
  ];
  const contentFields = [
    ["pastor_video_url", "Pastor video URL (secure MP4, YouTube, Vimeo or TikTok)"],
    ["home_intro", "Home page introduction"],
    ["about_intro", "About us / our story"],
    ["vision", "Vision"],
    ["mission", "Mission"],
    ["contact_email", "Contact email"],
    ["contact_phone", "Contact phone"],
    ["address", "Address"],
    ["bank_name", "Bank name"],
    ["bank_code", "Bank code"],
    ["account_name", "Account name"],
    ["account_number", "Account number"],
    ["account_type", "Account type"],
    ["payment_reference", "Payment reference"],
    ["payment_instructions", "Payment instructions"]
  ];
  let client;

  function showStatus(target, text, isError) {
    target.textContent = text;
    target.dataset.error = String(isError);
  }

  function setSignedIn(isSignedIn) {
    loginPanel.hidden = isSignedIn;
    dashboard.hidden = !isSignedIn;
  }

  function formatCurrency(amount, currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(Number(amount));
    } catch (error) {
      console.error("Could not format the contribution currency.", error);
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  }

  function isValidImagePath(path) {
    try {
      const url = new URL(path, window.location.origin);
      const config = window.REST_CHURCH_CONFIG;
      const supabaseUrl = config && config.supabaseUrl ? new URL(config.supabaseUrl) : null;
      const isLocalImage = url.origin === window.location.origin &&
        url.pathname.startsWith("/assets/images/");
      const isUploadedImage = supabaseUrl &&
        url.origin === supabaseUrl.origin &&
        url.pathname.startsWith("/storage/v1/object/public/site-images/");
      return (url.protocol === "https:" || url.origin === window.location.origin) &&
        (isLocalImage || isUploadedImage) &&
        /\.(svg|png|jpe?g|webp)$/i.test(url.pathname) &&
        (!/\.svg$/i.test(url.pathname) || isLocalImage) &&
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash;
    } catch {
      return false;
    }
  }

  function renderImageField(form, values, key, label) {
    const wrapper = document.createElement("div");
    wrapper.className = "content-field content-image-field";

    const fieldLabel = document.createElement("label");
    const id = `content-${key}`;
    fieldLabel.htmlFor = id;
    fieldLabel.textContent = label;

    const preview = document.createElement("img");
    preview.className = "content-image-preview";
    preview.alt = `${label} preview`;
    preview.hidden = true;

    const urlField = document.createElement("input");
    urlField.id = id;
    urlField.name = key;
    urlField.type = "text";
    urlField.readOnly = true;
    urlField.value = values.get(key) || "";
    urlField.placeholder = "Using the current website image";
    urlField.setAttribute("aria-label", `${label} image URL`);

    const fileField = document.createElement("input");
    fileField.type = "file";
    fileField.accept = "image/png,image/jpeg,image/webp";
    fileField.hidden = true;

    const uploadButton = document.createElement("button");
    uploadButton.className = "button button-outline";
    uploadButton.type = "button";
    uploadButton.textContent = "Choose and upload image";
    uploadButton.addEventListener("click", () => fileField.click());

    function updatePreview(source) {
      preview.hidden = !source;
      if (source) preview.src = source;
      else preview.removeAttribute("src");
    }

    if (urlField.value && isValidImagePath(urlField.value)) {
      updatePreview(urlField.value);
    }

    fileField.addEventListener("change", async function () {
      const file = fileField.files && fileField.files[0];
      fileField.value = "";
      if (!file) return;

      const extensions = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp"
      };
      const extension = extensions[file.type];
      if (!extension || file.size > 5 * 1024 * 1024) {
        showStatus(dashboardStatus, "Choose a JPG, PNG, or WebP image no larger than 5 MB.", true);
        return;
      }

      uploadButton.disabled = true;
      showStatus(dashboardStatus, `Uploading ${label.toLowerCase()}...`, false);
      try {
        const objectPath = `${crypto.randomUUID()}.${extension}`;
        const { error } = await client.storage.from("site-images").upload(objectPath, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false
        });
        if (error) throw new Error(error.message);

        const { data } = client.storage.from("site-images").getPublicUrl(objectPath);
        if (!isValidImagePath(data.publicUrl)) {
          throw new Error("The uploaded image URL does not match the configured Supabase project.");
        }
        urlField.value = data.publicUrl;
        updatePreview(data.publicUrl);
        showStatus(dashboardStatus, `${label} uploaded. Save website content to publish it.`, false);
      } catch (error) {
        showStatus(dashboardStatus, `Could not upload ${label.toLowerCase()}: ${error.message}`, true);
        console.error(`Could not upload ${label.toLowerCase()}.`, error);
      } finally {
        uploadButton.disabled = false;
      }
    });

    wrapper.append(fieldLabel, preview, urlField, fileField, uploadButton);
    form.appendChild(wrapper);
  }

  function isValidPastorVideoUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) return false;
      if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return true;

      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host === "youtu.be" || host === "youtube.com" || host === "youtube-nocookie.com") {
        const id = host === "youtu.be"
          ? url.pathname.slice(1).split("/")[0]
          : url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
        return Boolean(id && /^[A-Za-z0-9_-]{11}$/.test(id));
      }

      if (host === "vimeo.com" || host === "player.vimeo.com") {
        return /^\/(?:video\/)?\d+(?:\/|$)/.test(url.pathname);
      }

      return host === "tiktok.com" && /^\/@[\w.-]+\/video\/\d+\/?$/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value == null ? "" : String(value);
    row.appendChild(cell);
    return cell;
  }

  function renderStats(stats, newMessageCount) {
    const totals = (stats || []).map((item) => formatCurrency(item.total, item.currency)).join(" · ");
    document.getElementById("stat-total").textContent = totals || "—";
    document.getElementById("stat-count").textContent = String(
      (stats || []).reduce((count, item) => count + Number(item.contribution_count), 0)
    );
    document.getElementById("stat-messages").textContent = String(newMessageCount || 0);
  }

  function renderDonations(rows) {
    const body = document.getElementById("donations-table");
    body.replaceChildren();

    if (!rows.length) {
      const row = document.createElement("tr");
      const empty = document.createElement("td");
      empty.colSpan = 5;
      empty.textContent = "No verified contributions recorded.";
      row.appendChild(empty);
      body.appendChild(row);
      return;
    }

    rows.forEach((donation) => {
      const row = document.createElement("tr");
      addCell(row, donation.donated_on);
      addCell(row, donation.donor_name || "Anonymous");
      addCell(row, donation.reference);
      addCell(row, formatCurrency(donation.amount, donation.currency));
      const actionCell = document.createElement("td");
      const removeButton = document.createElement("button");
      removeButton.className = "table-action";
      removeButton.type = "button";
      removeButton.textContent = "Remove";
      removeButton.setAttribute("aria-label", `Remove contribution ${donation.reference}`);
      removeButton.addEventListener("click", async function () {
        if (!window.confirm("Remove this verified contribution record? This does not reverse or affect the bank transfer.")) return;
        try {
          const { error } = await client.from("donations").delete().eq("id", donation.id);
          if (error) throw new Error(error.message);
          showStatus(dashboardStatus, "Contribution record removed.", false);
          await refreshDashboard();
        } catch (error) {
          showStatus(dashboardStatus, `Could not remove the entry: ${error.message}`, true);
          console.error("Could not remove the contribution record.", error);
        }
      });
      actionCell.appendChild(removeButton);
      row.appendChild(actionCell);
      body.appendChild(row);
    });
  }

  function renderMessages(rows) {
    const list = document.getElementById("messages-list");
    list.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.className = "admin-help";
      empty.textContent = "No contact messages yet.";
      list.appendChild(empty);
      return;
    }

    rows.forEach((message) => {
      const card = document.createElement("article");
      card.className = "message-card";
      const top = document.createElement("div");
      top.className = "message-card-top";
      const heading = document.createElement("div");
      const title = document.createElement("h3");
      title.textContent = message.subject || "No subject";
      const meta = document.createElement("p");
      meta.className = "message-meta";
      meta.textContent = `${message.sender_name} · ${message.email} · ${new Date(message.created_at).toLocaleString()} · ${message.status}`;
      heading.append(title, meta);
      top.appendChild(heading);
      const body = document.createElement("p");
      body.className = "message-body";
      body.textContent = message.message;
      card.append(top, body);

      if (message.status !== "resolved") {
        const resolveButton = document.createElement("button");
        resolveButton.className = "message-action";
        resolveButton.type = "button";
        resolveButton.textContent = "Mark resolved";
        resolveButton.addEventListener("click", async function () {
          try {
            const { error } = await client.from("contact_messages").update({ status: "resolved" }).eq("id", message.id);
            if (error) throw new Error(error.message);
            showStatus(dashboardStatus, "Message marked resolved.", false);
            await refreshDashboard();
          } catch (error) {
            showStatus(dashboardStatus, `Could not update message: ${error.message}`, true);
            console.error("Could not update contact message status.", error);
          }
        });
        card.appendChild(resolveButton);
      }

      list.appendChild(card);
    });
  }

  async function loadContent() {
    const { data, error } = await client.from("site_content").select("key,value");
    if (error) throw new Error(`Could not load website content: ${error.message}`);

    const byKey = new Map((data || []).map((item) => [item.key, item.value]));
    const form = document.getElementById("content-form");
    form.replaceChildren();
    imageFields.forEach(([key, label]) => renderImageField(form, byKey, key, label));
    contentFields.forEach(([key, label]) => {
      const wrapper = document.createElement("div");
      wrapper.className = "content-field";
      const fieldLabel = document.createElement("label");
      const id = `content-${key}`;
      fieldLabel.htmlFor = id;
      fieldLabel.textContent = label;
      const textarea = document.createElement("textarea");
      textarea.id = id;
      textarea.name = key;
      textarea.maxLength = key === "account_number" ? 34 : 4000;
      textarea.value = byKey.get(key) || "";
      wrapper.append(fieldLabel, textarea);
      form.appendChild(wrapper);
    });
  }

  async function refreshDashboard() {
    showStatus(dashboardStatus, "Loading dashboard...", false);
    try {
      const results = await Promise.all([
        client.rpc("admin_donation_stats"),
        client.from("donations")
          .select("id,donated_on,donor_name,reference,amount,currency")
          .order("donated_on", { ascending: false })
          .limit(25),
        client.from("contact_messages")
          .select("id,sender_name,email,subject,message,status,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        client.from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
        loadContent()
      ]);

      const [statsResult, donationsResult, messagesResult, countResult] = results;
      for (const result of [statsResult, donationsResult, messagesResult, countResult]) {
        if (result.error) throw new Error(result.error.message);
      }

      renderStats(statsResult.data, countResult.count);
      renderDonations(donationsResult.data || []);
      renderMessages(messagesResult.data || []);
      showStatus(dashboardStatus, "Dashboard updated.", false);
    } catch (error) {
      showStatus(dashboardStatus, `Could not load all dashboard information: ${error.message}`, true);
      console.error("Could not load admin dashboard.", error);
    }
  }

  async function verifyAdmin() {
    const { data, error } = await client.rpc("is_site_admin");
    if (error) throw new Error(`Could not verify administrator access: ${error.message}`);
    return data === true;
  }

  async function activateDashboard() {
    if (!(await verifyAdmin())) {
      const { error } = await client.auth.signOut();
      if (error) console.error("Could not clear the unauthorized admin session.", error.message);
      setSignedIn(false);
      showStatus(loginStatus, "This account does not have administrator access.", true);
      return;
    }
    setSignedIn(true);
    await refreshDashboard();
  }

  function initContentEditor() {
    document.getElementById("save-content").addEventListener("click", async function () {
      const button = this;
      const fields = Array.from(document.querySelectorAll("#content-form [name]"));
      const rows = fields.map((field) => ({ key: field.name, value: field.value.trim() }));
      const videoUrl = rows.find((row) => row.key === "pastor_video_url").value;
      const invalidImage = rows.find((row) =>
        imageFields.some(([key]) => key === row.key) &&
        row.value &&
        !isValidImagePath(row.value)
      );
      if (invalidImage) {
        showStatus(dashboardStatus, "Choose an uploaded image or use an image under /assets/images/.", true);
        return;
      }
      if (videoUrl && !isValidPastorVideoUrl(videoUrl)) {
        showStatus(dashboardStatus, "Use a secure direct video link (MP4, WebM, or Ogg), or a YouTube, Vimeo, or TikTok video URL.", true);
        return;
      }
      button.disabled = true;
      showStatus(dashboardStatus, "Saving website content...", false);
      try {
        const { error } = await client.from("site_content").upsert(rows, { onConflict: "key" });
        if (error) throw new Error(error.message);
        showStatus(dashboardStatus, "Website content saved.", false);
      } catch (error) {
        showStatus(dashboardStatus, `Could not save website content: ${error.message}`, true);
        console.error("Could not save website content.", error);
      } finally {
        button.disabled = false;
      }
    });
  }

  function initDonationForm() {
    const form = document.getElementById("donation-form");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const fields = new FormData(form);
      const entry = {
        amount: Number(fields.get("amount")),
        currency: String(fields.get("currency") || "").trim().toUpperCase(),
        donor_name: String(fields.get("donor_name") || "").trim() || null,
        reference: String(fields.get("reference") || "").trim(),
        donated_on: String(fields.get("donated_on") || ""),
        notes: String(fields.get("notes") || "").trim() || null
      };

      if (!(entry.amount > 0) || !/^[A-Z]{3}$/.test(entry.currency) || !entry.reference || !entry.donated_on) {
        showStatus(dashboardStatus, "Enter a valid amount, three-letter currency, bank reference, and date.", true);
        return;
      }

      const button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      try {
        const { error } = await client.from("donations").insert(entry);
        if (error) throw new Error(error.message);
        form.reset();
        showStatus(dashboardStatus, "Verified contribution recorded.", false);
        await refreshDashboard();
      } catch (error) {
        showStatus(dashboardStatus, `Could not record the contribution: ${error.message}`, true);
        console.error("Could not record a verified contribution.", error);
      } finally {
        button.disabled = false;
      }
    });
  }

  async function start() {
    try {
      client = window.getRestChurchClient();
    } catch (error) {
      showStatus(loginStatus, "The admin service could not be initialized. Check the Supabase client configuration.", true);
      console.error("Could not initialize the admin client.", error);
      return;
    }
    if (!client) {
      showStatus(loginStatus, "The admin service is not configured. Complete the Supabase setup before signing in.", true);
      return;
    }

    initContentEditor();
    initDonationForm();

    loginForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      showStatus(loginStatus, "Signing in...", false);
      const formData = new FormData(loginForm);
      try {
        const { error } = await client.auth.signInWithPassword({
          email: String(formData.get("email") || "").trim(),
          password: String(formData.get("password") || "")
        });
        if (error) throw new Error(error.message);
        loginForm.reset();
        await activateDashboard();
      } catch (error) {
        showStatus(loginStatus, `Sign-in failed: ${error.message}`, true);
        console.error("Administrator sign-in failed.", error);
      }
    });

    document.getElementById("sign-out").addEventListener("click", async function () {
      try {
        const { error } = await client.auth.signOut();
        if (error) throw new Error(error.message);
        setSignedIn(false);
        showStatus(loginStatus, "You are signed out.", false);
      } catch (error) {
        showStatus(dashboardStatus, `Could not sign out: ${error.message}`, true);
        console.error("Administrator sign-out failed.", error);
      }
    });

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw new Error(error.message);
      if (data.session) await activateDashboard();
    } catch (error) {
      showStatus(loginStatus, `Could not restore the admin session: ${error.message}`, true);
      console.error("Could not restore administrator session.", error);
    }
  }

  start();
})();
