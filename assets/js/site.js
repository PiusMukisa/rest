(function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const navItems = [
    ["index.html", "Home"],
    ["projects.html", "Projects"],
    ["about.html", "About Us"],
    ["contact.html", "Contact Us"]
  ];
  const defaultPastorVideoUrl = "https://www.tiktok.com/@muwayifaizal/video/7704317331232607495?is_from_webapp=1&sender_device=pc";

  function renderHeader() {
    const mount = document.querySelector("[data-site-header]");
    if (!mount) return;

    const links = navItems.map(([href, label]) => {
      const current = currentPage === href ? ' aria-current="page"' : "";
      return `<a href="${href}"${current}>${label}</a>`;
    }).join("");

    mount.innerHTML = `
      <header class="site-header">
        <a class="wordmark" href="index.html" aria-label="Rest Church Ministries home">
          <img class="wordmark-logo" src="assets/images/rest-church-mark.png" alt="">
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">MENU</button>
        <nav class="site-nav" id="primary-navigation" aria-label="Main navigation">
          ${links}
          <a class="nav-give" href="donations.html"${currentPage === "donations.html" ? ' aria-current="page"' : ""}>Give</a>
        </nav>
      </header>`;

    const toggle = mount.querySelector(".menu-toggle");
    const nav = mount.querySelector(".site-nav");
    toggle.addEventListener("click", function () {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
      toggle.textContent = open ? "CLOSE" : "MENU";
    });
  }

  function renderFooter() {
    const mount = document.querySelector("[data-site-footer]");
    if (!mount) return;
    mount.innerHTML = `
      <footer class="site-footer">
        <div class="footer-main">
          <div class="footer-brand">
            <a class="wordmark" href="index.html" aria-label="Rest Church Ministries home">
              <img class="wordmark-logo" src="assets/images/rest-church-mark.png" alt="">
            </a>
            <p>A channel of elevating leaders to function holistically, equipping them to integrate discipleship and mission.</p>
            <a class="footer-vision-link" href="about.html#vision">SEEK THE LOST · DISCIPLE THE FOUND <span aria-hidden="true">↗</span></a>
          </div>
          <div class="footer-link-group">
            <h2>EXPLORE</h2>
            <nav class="footer-nav" aria-label="Explore the church">
              <a href="index.html">Home</a>
              <a href="projects.html">Church projects</a>
              <a href="about.html">About the church</a>
              <a href="about.html#leadership">Our leadership</a>
              <a href="about.html#faith">Statement of faith</a>
            </nav>
          </div>
          <div class="footer-link-group">
            <h2>CONNECT & SUPPORT</h2>
            <nav class="footer-nav" aria-label="Connect and support the church">
              <a href="contact.html">Contact us</a>
              <a href="https://www.youtube.com/@restchurch469" target="_blank" rel="noopener noreferrer"><span class="footer-social-icon footer-social-icon-youtube" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg></span>YouTube channel</a>
              <a href="https://wa.me/256704868211" target="_blank" rel="noopener noreferrer"><span class="footer-social-icon footer-social-icon-whatsapp" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 .1 5.3.1 11.8c0 2.1.6 4.1 1.6 5.9L0 24l6.5-1.7a12 12 0 0 0 5.5 1.4h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4ZM12 21.7a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.9 1 1-3.8-.2-.4a9.8 9.8 0 0 1-1.5-5.1A10 10 0 1 1 12 21.7Zm5.5-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.7.9-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.4.1-.6l.5-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.6-.9-2.1-.2-.5-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.7 1.1 2.9c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.1-1.3 0-.2-.2-.3-.5-.4Z"/></svg></span>WhatsApp us</a>
              <a href="tel:+256704868211">Call 0704868211</a>
              <a href="donations.html">Ways to give</a>
              <a href="about.html#objectives">Our mission</a>
              <a href="about.html#values">Core values</a>
            </nav>
          </div>
          <a class="footer-cta" href="contact.html"><span class="eyebrow">WALK WITH US</span><strong>Faith grows<br>in community.</strong><span class="footer-cta-arrow" aria-hidden="true">↗</span></a>
        </div>
        <div class="footer-bottom">
          <span>REST CHURCH MINISTRIES</span>
          <span>THE WORD · PRAYER · DISCIPLESHIP · HOSPITALITY</span>
          <a href="admin.html">ADMIN SIGN IN <span aria-hidden="true">↗</span></a>
        </div>
      </footer>`;
  }

  function applyContent(rows) {
    const values = new Map(rows.map((row) => [row.key, row.value]));
    applyLogo(values.get("logo_path"));
    document.querySelectorAll("img[data-site-image]").forEach((image) => {
      const path = values.get(image.dataset.siteImage);
      if (typeof path === "string" && path.trim()) {
        applyImage(image, path);
      }
    });
    document.querySelectorAll("[data-content]").forEach((element) => {
      const value = values.get(element.dataset.content);
      if (typeof value === "string" && value.trim()) {
        if (element.dataset.contactLink === "email") {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
            console.error("The configured church contact email address is invalid.");
            return;
          }
          element.href = `mailto:${value.trim()}`;
        } else if (element.dataset.contactLink === "phone") {
          if (!/^[+()\d\s-]+$/.test(value.trim())) {
            console.error("The configured church contact phone number is invalid.");
            return;
          }
          const number = value.trim().replace(/[()\s-]/g, "");
          const internationalNumber = number.startsWith("+")
            ? number
            : number.startsWith("0")
              ? `+256${number.slice(1)}`
              : number;
          if (!/^\+\d{7,15}$/.test(internationalNumber)) {
            console.error("The configured church contact phone number is invalid.");
            return;
          }
          const callLink = element.closest("a");
          if (callLink) callLink.href = `tel:${internationalNumber}`;
        }
        element.textContent = value;
        element.classList.remove("unconfigured-value");
      }
    });
  }

  function applyImage(image, path) {
    try {
      const url = new URL(path.trim(), window.location.origin);
      const config = window.REST_CHURCH_CONFIG;
      const supabaseUrl = config && config.supabaseUrl ? new URL(config.supabaseUrl) : null;
      const isLocalImage = url.origin === window.location.origin &&
        url.pathname.startsWith("/assets/images/");
      const isUploadedImage = supabaseUrl &&
        url.origin === supabaseUrl.origin &&
        url.pathname.startsWith("/storage/v1/object/public/site-images/");
      if (
        (url.protocol !== "https:" && url.origin !== window.location.origin) ||
        (!isLocalImage && !isUploadedImage) ||
        !/\.(svg|png|jpe?g|webp)$/i.test(url.pathname) ||
        (/\.svg$/i.test(url.pathname) && !isLocalImage) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      ) {
        throw new Error("The image must be in the local assets/images folder or the site's Supabase image bucket.");
      }
      image.src = url.href;
    } catch (error) {
      console.error(`Could not apply the configured image for ${image.dataset.siteImage}.`, error);
    }
  }

  function applyLogo(path) {
    if (typeof path !== "string" || !path.trim()) return;

    document.querySelectorAll(".wordmark").forEach((wordmark) => {
      const image = wordmark.querySelector(".wordmark-logo");
      if (!image) return;
      image.hidden = false;
      image.addEventListener("error", function () {
        image.hidden = true;
        console.error("Could not load the configured Rest Church Ministries logo.");
      }, { once: true });
      applyImage(image, path);
    });
  }

  function getVideoSource(value) {
    if (typeof value !== "string" || !value.trim()) return null;

    let url;
    try {
      url = new URL(value.trim());
    } catch (error) {
      console.error("The pastor video URL is invalid.", error);
      return null;
    }

    if (url.protocol !== "https:" || url.username || url.password) return null;

    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
      return { type: "file", url: url.href };
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let videoId = null;
    if (host === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0];
    } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
      videoId = url.searchParams.get("v") || url.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    }
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      return { type: "youtube", url: `https://www.youtube-nocookie.com/embed/${videoId}` };
    }

    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const match = url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/|$)/);
      if (match) return { type: "vimeo", url: `https://player.vimeo.com/video/${match[1]}` };
    }

    if (host === "tiktok.com") {
      const match = url.pathname.match(/^\/@[\w.-]+\/video\/(\d+)\/?$/);
      if (match) return { type: "tiktok", url: `https://www.tiktok.com/player/v1/${match[1]}?autoplay=1&muted=1` };
    }

    return null;
  }

  function initPastorVideo() {
    const trigger = document.querySelector("[data-video-trigger]");
    const dialog = document.getElementById("pastor-video-dialog");
    const player = dialog?.querySelector("[data-video-player]");
    if (!trigger || !dialog || !player) return;

    let videoSource = getVideoSource(defaultPastorVideoUrl);
    let videoMessage = "Select play to watch the pastor’s message.";
    const message = player.querySelector("[data-video-message]");
    const closeButton = dialog.querySelector("[data-video-close]");

    trigger.addEventListener("click", function () {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        window.alert(message?.textContent || "Video playback is not supported in this browser.");
        return;
      }

      if (!videoSource) return;
      if (player.querySelector("video, iframe")) return;
      if (message) message.hidden = true;

      let media;
      if (videoSource.type === "file") {
        media = document.createElement("video");
        media.controls = true;
        media.autoplay = true;
        media.playsInline = true;
        media.preload = "metadata";
        media.src = videoSource.url;
        media.addEventListener("error", function () {
          if (message) {
            message.hidden = false;
            message.textContent = "The video could not be loaded. Please check the video URL and try again.";
          }
        }, { once: true });
      } else {
        media = document.createElement("iframe");
        media.title = "Rest Church Ministries pastor’s message";
        media.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share";
        media.allowFullscreen = true;
        media.referrerPolicy = "strict-origin-when-cross-origin";
        media.src = videoSource.type === "tiktok" || videoSource.url.includes("?")
          ? videoSource.url
          : `${videoSource.url}?autoplay=1`;
        if (videoSource.type === "tiktok") player.classList.add("is-portrait");
      }
      player.appendChild(media);
    });

    closeButton.addEventListener("click", function () {
      dialog.close();
    });

    dialog.addEventListener("click", function (event) {
      if (event.target === dialog) dialog.close();
    });

    dialog.addEventListener("close", function () {
      player.querySelector("video, iframe")?.remove();
      player.classList.remove("is-portrait");
      if (message) {
        message.textContent = videoMessage;
        message.hidden = false;
      }
    });

    document.addEventListener("rest-church-content-loaded", function (event) {
      const configuredUrl = event.detail?.get("pastor_video_url") || defaultPastorVideoUrl;
      videoSource = getVideoSource(configuredUrl);
      if (configuredUrl && !videoSource) {
        console.error("The pastor video URL must be a secure MP4, WebM, or Ogg file, or a supported YouTube, Vimeo, or TikTok video.");
      }
      videoMessage = configuredUrl && !videoSource
        ? "The pastor video link is not valid. Please contact the church or ask an administrator to update it."
        : videoSource
          ? "Select play to watch the pastor’s message."
          : "The church has not added the pastor’s video yet. Add a church-approved video URL in the admin dashboard to enable playback.";
      if (message) {
        message.textContent = videoMessage;
        if (dialog.open) message.hidden = false;
      }
    });
  }

  async function loadContent() {
    let client;
    try {
      client = window.getRestChurchClient();
    } catch (error) {
      console.error("Could not initialize the website database client.", error);
      return;
    }
    if (!client) return;

    try {
      const { data, error } = await client.from("site_content").select("key,value");
      if (error) {
        console.error("Could not load website information.", error.message);
        return;
      }
      applyContent(data || []);
      document.dispatchEvent(new CustomEvent("rest-church-content-loaded", {
        detail: new Map((data || []).map((row) => [row.key, row.value]))
      }));
    } catch (error) {
      console.error("Could not load website information.", error);
      return;
    }
  }

  renderHeader();
  renderFooter();
  initPastorVideo();
  loadContent();
})();
