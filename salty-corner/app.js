/* The Salty Corner: demo storefront (no backend; basket saved in this browser) */

const fmt = (n) => "€" + n.toFixed(2);

/* Live mode turns on when config.js has Supabase keys. Without them the site stays a demo. */
const CFG = window.SC_CONFIG || {};
const LIVE = Boolean(CFG.supabaseUrl && CFG.supabaseAnonKey);
const PAYMENT_LINKS = {
  sunshine: "https://buy.stripe.com/8x2eVd8Q1bkg8YD83ffAc00",
  "santas-kitchen": "https://buy.stripe.com/5kQaEX2rDfAw8YDcjvfAc02",
  "gentlemans-crate": "https://buy.stripe.com/4gMdR96HTews3EjabnfAc01",
};
const PAYMENT_LINK_MODE = true;

/* ---------- Illustrations ---------- */

// A gift box drawn in the logo's palette. stack=true draws two boxes.
function boxSVG({ box, lid, ribbon, stack = false }) {
  const bow = (x, y, s = 1) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <path d="M0 0 C -14 -24, -40 -20, -30 -4 C -24 4, -10 3, 0 0Z" fill="${ribbon}"/>
      <path d="M0 0 C 14 -24, 40 -20, 30 -4 C 24 4, 10 3, 0 0Z" fill="${ribbon}"/>
      <path d="M-2 2 L -14 22 L -6 20 L 0 4Z M2 2 L 14 22 L 6 20 L 0 4Z" fill="${ribbon}" opacity=".85"/>
      <circle r="6" fill="${ribbon}"/><circle r="6" fill="#000" opacity=".12"/>
    </g>`;
  const single = (x, y, w, h, s = 1, withBow = true) => `
    <rect x="${x}" y="${y + 18 * s}" width="${w}" height="${h}" rx="4" fill="${box}"/>
    <rect x="${x + w * 0.62}" y="${y + 18 * s}" width="${w * 0.38}" height="${h}" rx="4" fill="#000" opacity=".07"/>
    <rect x="${x - 7 * s}" y="${y}" width="${w + 14 * s}" height="${22 * s}" rx="4" fill="${lid}"/>
    <rect x="${x - 7 * s}" y="${y + 17 * s}" width="${w + 14 * s}" height="${5 * s}" fill="#000" opacity=".08"/>
    <rect x="${x + w / 2 - 8 * s}" y="${y}" width="${16 * s}" height="${h + 18 * s}" fill="${ribbon}"/>
    ${withBow ? bow(x + w / 2, y, s) : ""}`;
  const body = stack
    ? single(36, 86, 128, 52, 1, false) + single(62, 38.5, 76, 34, 0.75)
    : single(40, 58, 120, 80);
  return `<svg viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <ellipse cx="100" cy="158" rx="78" ry="8" fill="#34472f" opacity=".12"/>
    <g filter="url(#wobble)">${body}</g>
  </svg>`;
}

const ICONS = {
  book: `<rect x="12" y="14" width="34" height="38" rx="3" fill="#c9805f"/><rect x="12" y="14" width="7" height="38" rx="2" fill="#a8664a"/><rect x="24" y="22" width="16" height="5" rx="1" fill="#fbecd3"/><rect x="46" y="17" width="3" height="32" fill="#fbecd3"/>`,
  musicbox: `<rect x="10" y="30" width="40" height="22" rx="3" fill="#b98a5a"/><path d="M10 30 L 16 12 L 54 16 L 50 30Z" fill="#cfa274"/><circle cx="30" cy="41" r="4" fill="#7a5a35"/><path d="M42 6 v10" stroke="#557049" stroke-width="2.4"/><circle cx="39" cy="17" r="3.5" fill="#557049"/>`,
  doll: `<path d="M18 54 L 30 28 L 42 54Z" fill="#e8b4ad"/><circle cx="30" cy="20" r="10" fill="#f6dcc8"/><path d="M20 19 a10 10 0 0 1 20 0 c-4 -3 -16 -3 -20 0z" fill="#7a5a35"/><circle cx="26.5" cy="21" r="1.2" fill="#2c3327"/><circle cx="33.5" cy="21" r="1.2" fill="#2c3327"/><circle cx="30" cy="40" r="2" fill="#fbecd3"/><circle cx="25" cy="47" r="2" fill="#fbecd3"/><circle cx="35" cy="47" r="2" fill="#fbecd3"/>`,
  salt: `<rect x="17" y="18" width="26" height="34" rx="6" fill="#eef3e6" stroke="#a9bf94" stroke-width="2"/><rect x="15" y="10" width="30" height="9" rx="2" fill="#557049"/><rect x="20" y="28" width="20" height="13" rx="2" fill="#fbecd3"/><path d="M20 46 h20" stroke="#fff" stroke-width="4"/>`,
  sweets: `<path d="M12 36 h36 l-5 16 h-26z" fill="#f3c877"/><path d="M12 36 l4 16 M20 36 l2 16 M30 36 v16 M40 36 l-2 16 M48 36 l-4 16" stroke="#d9a85a" stroke-width="1.2"/><ellipse cx="22" cy="32" rx="8" ry="6" fill="#c9805f"/><ellipse cx="38" cy="32" rx="8" ry="6" fill="#a8664a"/><ellipse cx="30" cy="25" rx="7" ry="5.5" fill="#cfa274"/>`,
  candle: `<rect x="16" y="24" width="28" height="28" rx="5" fill="#b7d0d8"/><rect x="16" y="32" width="28" height="9" fill="#fbecd3"/><path d="M30 24 v-5" stroke="#2c3327" stroke-width="1.5"/><path d="M30 6 c5 6 4 12 0 13 c-4 -1 -5 -7 0 -13z" fill="#f7d98f"/>`,
  notebook: `<rect x="14" y="10" width="32" height="42" rx="3" fill="#cfa274"/><circle cx="20" cy="18" r="1" fill="#a8664a"/><circle cx="36" cy="24" r="1" fill="#a8664a"/><circle cx="24" cy="40" r="1" fill="#a8664a"/><circle cx="40" cy="44" r="1" fill="#a8664a"/><rect x="38" y="10" width="4" height="42" fill="#557049"/>`,
  blanket: `<rect x="10" y="22" width="40" height="28" rx="8" fill="#fbecd3"/><path d="M10 30 h40 M10 38 h40" stroke="#e8b4ad" stroke-width="4"/><rect x="10" y="22" width="40" height="28" rx="8" fill="none" stroke="#a9bf94" stroke-width="2"/>`,
};
const icon = (k) => `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${ICONS[k]}</svg>`;

/* ---------- Data (demo content, edit freely) ---------- */

const PRODUCTS = [
  {
    id: "sunshine", name: "The Sunshine Box", badge: "New", live: true,
    desc: "A warm ray of Algarve sunshine for birthdays, special milestones, and creative afternoons. Keepsakes and creative treasures come wrapped in delicate floral tissue inside our signature crate.",
    contents: [
      "Lilly’s Dream illustrated storybook about dreams and adventure",
      "Hand-cranked wooden You Are My Sunshine music box",
      "Heart-patterned lockable diary with a gold heart-shaped padlock, keys, and pastel pen",
      "Pink scalloped heart keepsake box",
      "Painted wooden unicorn figurine on a pastel base",
      "Mandala colouring book and pastel coloured pencils",
      "Two hot-air balloon magnetic bookmarks and two pastel heart page markers",
    ],
    price: 79,
    shipping: "Free shipping across Portugal.",
    tags: ["kids", "birthday"], img: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_58%20PM.png",
    alt: "Packed Sunshine Box with a heart-patterned diary, unicorn, music box and pink keepsake box",
    contentsImg: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_55%20PM.png",
    contentsAlt: "Sunshine Box contents laid out, including Lilly’s Dream, a colouring book, pencils and bookmarks",
  },
  {
    img: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_41%20PM.png",
    alt: "Open Christmas crate packed with festive mugs, cocoa and a candy-cane rolling pin",
    contentsImg: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_45%20PM.png",
    contentsAlt: "Christmas crate contents laid out, including the recipe book, mugs and gingerbread ornament",
    id: "santas-kitchen", name: "Santa’s Kitchen & Cocoa Crate", badge: "Limited Christmas Edition",
    desc: "Wrapped in festive gold tissue inside a custom-stamped crate, this limited edition is made for family afternoons baking cookies, sipping hot chocolate, and listening to Christmas melodies.",
    contents: [
      "My Christmas Recipes keepsake book, an illustrated hardcover for treasured holiday recipes",
      "Santa’s Hot Chocolate Café Set with cocoa powder, gold-wrapped chocolates, and mini marshmallows",
      "Two ceramic mugs, forest green HO HO HO and festive red FALALALA",
      "Wooden rolling pin patterned with candy canes",
      "Hand-cranked Merry Christmas music box",
      "Plush gingerbread ornament with a gingham bow",
      "Three illustrated Christmas bookmarks and a festive pen",
    ],
    shipping: "Curated in the Algarve, Portugal, and shipped via registered CTT mail.",
    price: 78,
    shipping: "Free shipping across Portugal.",
    tags: ["christmas"], art: { box: "#fbecd3", lid: "#7a9867", ribbon: "#c9805f" },
  },
  {
    img: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_48%20PM.png",
    alt: "Packed Explorer’s Desk crate with air mail envelopes, leather bookmarks and a pocket watch",
    contentsImg: "assets/ChatGPT%20Image%20Nov%2025%2C%202026%2C%2006_02_52%20PM.png",
    contentsAlt: "Explorer’s Desk contents laid out, including journals, fountain pen, compass and pocket watch",
    id: "gentlemans-crate", name: "The Gentleman’s Crate", badge: "The Explorer’s Desk Edition",
    desc: "Wrapped in antique world-map tissue inside our signature crate, this gift set pairs warm leather, brass-tone details, and vintage stationery. Curated in the Algarve for birthdays, retirements, and Father’s Day.",
    contents: [
      "Stitched brown leather journal and planner with a snap closure",
      "Vintage map-themed notebook inspired by classic exploration logs",
      "Wooden fountain pen and glass ink bottle",
      "Three retro air mail envelopes",
      "Two stitched leather leaf corner bookmarks",
      "Engraved brass-tone pocket compass",
      "Mechanical wind-up skeleton pocket watch with chain and keepsake box",
    ],
    price: 95,
    tags: ["birthday", "thanks"], art: { box: "#fbecd3", lid: "#cfa274", ribbon: "#557049" },
  },
  { id: "reader", name: "Little Reader", contents: ["Picture book", "Bookmark", "Mini blanket"], price: 34, tags: ["kids", "birthday"], art: { box: "#dfe8d2", lid: "#a9bf94", ribbon: "#c9805f" } },
  { id: "melody", name: "Melody Box", contents: ["Wooden music box", "Scented candle", "Hand-written card"], price: 48, tags: ["birthday", "thanks"], art: { box: "#fbecd3", lid: "#cfa274", ribbon: "#7a9867" } },
  { id: "baby", name: "Hello Baby", contents: ["Rag doll", "Soft blanket", "First book"], price: 56, tags: ["baby"], art: { box: "#f6e3df", lid: "#e8b4ad", ribbon: "#7a9867" }, badge: "Bestseller" },
  { id: "algarve", name: "Taste of the Algarve", contents: ["Flor de sal", "Almond & fig sweets", "Cork notebook"], price: 42, tags: ["thanks"], art: { box: "#b7d0d8", lid: "#fbecd3", ribbon: "#c9805f" }, stack: true, badge: "Local" },
  { id: "calm", name: "Seaside Calm", contents: ["Scented candle", "Soft blanket", "Flor de sal"], price: 38, tags: ["thanks", "birthday"], art: { box: "#eef3e6", lid: "#b7d0d8", ribbon: "#557049" } },
];

const SIZES = [
  { id: "petite", name: "Petite", max: 3, price: 6, art: { box: "#fbecd3", lid: "#a9bf94", ribbon: "#c9805f" } },
  { id: "classic", name: "Classic", max: 5, price: 9, art: { box: "#dfe8d2", lid: "#7a9867", ribbon: "#e8b4ad" } },
  { id: "grand", name: "Grand", max: 7, price: 12, art: { box: "#f6e3df", lid: "#e8b4ad", ribbon: "#557049" }, stack: true },
];

const ITEMS = [
  { id: "book", name: "Picture book", price: 14 },
  { id: "musicbox", name: "Music box", price: 19 },
  { id: "doll", name: "Rag doll", price: 22 },
  { id: "salt", name: "Flor de sal", price: 7 },
  { id: "sweets", name: "Almond & fig sweets", price: 9 },
  { id: "candle", name: "Scented candle", price: 12 },
  { id: "notebook", name: "Cork notebook", price: 10 },
  { id: "blanket", name: "Soft blanket", price: 18 },
];

/* ---------- Helpers ---------- */

const $ = (s) => document.querySelector(s);
let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
}
const store = {
  get() { try { return JSON.parse(localStorage.getItem("sc-cart")) || []; } catch { return []; } },
  set(v) { try { localStorage.setItem("sc-cart", JSON.stringify(v)); } catch {} },
};

/* ---------- Shop grid ---------- */

const priceLabel = (p) => (p.price == null ? "Price soon" : fmt(p.price));
function buyButton(p, cls = "add-btn") {
  if (PAYMENT_LINKS[p.id]) {
    return `<a class="btn btn-primary ${cls}" href="${PAYMENT_LINKS[p.id]}">Buy now</a>`;
  }
  if (p.price == null || PAYMENT_LINK_MODE || (LIVE && !p.live)) {
    return `<button class="btn btn-primary ${cls}" disabled>Coming soon</button>`;
  }
  return `<button class="btn btn-primary ${cls}" data-add="${p.id}">Add to basket</button>`;
}


function renderProducts(filter = "all") {
  const list = PRODUCTS.filter((p) => p.img && (filter === "all" || p.tags.includes(filter)));
  $("#productGrid").innerHTML = list.map((p, i) => `
    <article class="card" style="animation-delay:${i * 60}ms">
      <div class="product-photos">
        <button type="button" class="product-photo" data-product="${p.id}" aria-label="View ${p.name} details">
          <img src="${p.img}" alt="${p.alt}" loading="lazy" />
        </button>
      </div>
      <div class="card-body">
        ${p.badge ? `<span class="product-edition">${p.badge}</span>` : ""}
        <h3>${p.name}</h3>
        <button type="button" class="chip details-button" data-product="${p.id}">What’s inside</button>
        <div class="card-foot">
          <span class="price">${priceLabel(p)}</span>
          ${buyButton(p)}
        </div>
      </div>
    </article>`).join("");
}

$("#filters").addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  document.querySelectorAll("#filters .chip").forEach((c) => {
    c.classList.toggle("is-active", c === chip);
    c.setAttribute("aria-pressed", String(c === chip));
  });
  renderProducts(chip.dataset.filter);
});

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  const p = PRODUCTS.find((x) => x.id === btn.dataset.add);
  addToCart({ key: p.id, name: p.name, detail: p.contents.join(" · "), price: p.price, art: p.art, stack: p.stack, img: p.img });
});

const productDialog = $("#productDialog");
$("#productGrid").addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-product]");
  if (!trigger) return;
  const product = PRODUCTS.find((p) => p.id === trigger.dataset.product);
  $("#productTitle").textContent = product.name;
  $("#productDetails").innerHTML = `
    <div class="dialog-photos">
      <img src="${product.img}" alt="${product.alt}" />
      <img src="${product.contentsImg}" alt="${product.contentsAlt}" />
    </div>
    <p>${product.desc}</p>
    <h3>What’s inside</h3>
    <ul class="contents">${product.contents.map((item) => `<li>${item}</li>`).join("")}</ul>
    ${product.shipping ? `<p>${product.shipping}</p>` : ""}
    <div class="card-foot"><span class="price">${priceLabel(product)}</span>${buyButton(product)}</div>`;
  productDialog.scrollTop = 0;
  productDialog.showModal();
});

/* ---------- Build a box ---------- */

const build = { size: SIZES[1], items: new Set() };

function renderBuilder() {
  $("#sizes").innerHTML = SIZES.map((s) => `
    <button class="size ${build.size.id === s.id ? "is-active" : ""}" data-size="${s.id}">
      ${boxSVG({ ...s.art, stack: s.stack })}
      <strong>${s.name}</strong>
      <small>${s.max} items · ${fmt(s.price)}</small>
    </button>`).join("");

  const full = build.items.size >= build.size.max;
  $("#items").innerHTML = ITEMS.map((it) => {
    const on = build.items.has(it.id);
    return `
    <button class="item ${on ? "is-active" : ""}" data-item="${it.id}" ${full && !on ? "disabled" : ""} aria-pressed="${on}">
      <span class="check"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>
      ${icon(it.id)}
      <strong>${it.name}</strong>
      <small>${fmt(it.price)}</small>
    </button>`;
  }).join("");

  $("#fillHint").textContent = `${build.items.size} / ${build.size.max}`;

  const chosen = ITEMS.filter((i) => build.items.has(i.id));
  $("#shelf").innerHTML = chosen.length
    ? chosen.map((i) => icon(i.id)).join("")
    : `<p class="shelf-empty">Your box is empty</p>`;

  const total = build.size.price + chosen.reduce((s, i) => s + i.price, 0);
  $("#buildTotal").textContent = fmt(chosen.length ? total : 0);
  $("#addCustom").disabled = chosen.length === 0 || LIVE || PAYMENT_LINK_MODE;
  if (LIVE || PAYMENT_LINK_MODE) $("#addCustom").textContent = "Coming soon";
}

$("#sizes").addEventListener("click", (e) => {
  const b = e.target.closest("[data-size]");
  if (!b) return;
  build.size = SIZES.find((s) => s.id === b.dataset.size);
  // trim selection if the new box is smaller
  [...build.items].slice(build.size.max).forEach((id) => build.items.delete(id));
  renderBuilder();
});

$("#items").addEventListener("click", (e) => {
  const b = e.target.closest("[data-item]");
  if (!b || b.disabled) return;
  const id = b.dataset.item;
  build.items.has(id) ? build.items.delete(id) : build.items.add(id);
  renderBuilder();
});

$("#addCustom").addEventListener("click", () => {
  const chosen = ITEMS.filter((i) => build.items.has(i.id));
  const note = $("#giftNote").value.trim();
  addToCart({
    key: "custom-" + Date.now(),
    name: `Custom ${build.size.name} box`,
    detail: chosen.map((i) => i.name).join(" · ") + (note ? ` · Note: “${note}”` : ""),
    price: build.size.price + chosen.reduce((s, i) => s + i.price, 0),
    art: build.size.art, stack: build.size.stack,
  });
  build.items.clear();
  $("#giftNote").value = "";
  renderBuilder();
});

/* ---------- Basket ---------- */

let cart = store.get();

function addToCart(line) {
  const found = cart.find((l) => l.key === line.key);
  found ? found.qty++ : cart.push({ ...line, qty: 1 });
  saveCart();
  toast(`Added: ${line.name}`);
  const c = $("#cartCount");
  c.classList.remove("bump"); void c.offsetWidth; c.classList.add("bump");
}

function saveCart() { store.set(cart); renderCart(); }

function renderCart() {
  const count = cart.reduce((s, l) => s + l.qty, 0);
  $("#cartCount").textContent = count;
  $("#cartTotal").textContent = fmt(cart.reduce((s, l) => s + l.price * l.qty, 0));
  $("#checkout").disabled = count === 0;
  $("#cartItems").innerHTML = cart.length
    ? cart.map((l) => `
      <div class="line">
        <div class="line-art">${l.img ? `<img src="${l.img}" alt="" />` : boxSVG({ ...l.art, stack: l.stack })}</div>
        <div>
          <h4>${l.name}</h4>
          <small>${escapeHTML(l.detail)}</small>
          <div class="qty">
            <button data-dec="${l.key}" aria-label="Decrease">−</button>
            <span>${l.qty}</span>
            <button data-inc="${l.key}" aria-label="Increase">+</button>
          </div>
        </div>
        <span class="line-price">${fmt(l.price * l.qty)}</span>
      </div>`).join("")
    : `<div class="empty-cart">${boxSVG({ box: "#eef3e6", lid: "#dfe8d2", ribbon: "#a9bf94" })}<p>Your basket is empty</p></div>`;
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

$("#cartItems").addEventListener("click", (e) => {
  const inc = e.target.closest("[data-inc]");
  const dec = e.target.closest("[data-dec]");
  if (!inc && !dec) return;
  const key = (inc || dec).dataset.inc || (inc || dec).dataset.dec;
  const line = cart.find((l) => l.key === key);
  line.qty += inc ? 1 : -1;
  if (line.qty <= 0) cart = cart.filter((l) => l !== line);
  saveCart();
});

function openCart(open) {
  $("#drawer").classList.toggle("is-open", open);
  $("#drawer").setAttribute("aria-hidden", String(!open));
  $("#overlay").hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
}
$("#cartOpen").addEventListener("click", () => openCart(true));
$("#cartClose").addEventListener("click", () => openCart(false));
$("#overlay").addEventListener("click", () => openCart(false));
document.addEventListener("keydown", (e) => e.key === "Escape" && openCart(false));

$("#checkout").addEventListener("click", async () => {
  if (!LIVE) return toast("Demo: checkout not connected");
  const btn = $("#checkout");
  btn.disabled = true;
  btn.textContent = "One moment...";
  try {
    const res = await fetch(`${CFG.supabaseUrl}/functions/v1/create-checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.supabaseAnonKey },
      body: JSON.stringify({
        items: cart.map((l) => ({ id: l.key, qty: l.qty })),
        note: $("#orderNote").value.trim().slice(0, 160),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
    window.location.href = data.url;
  } catch (err) {
    toast(err.message || "Something went wrong. Please try again.");
    btn.disabled = false;
    btn.textContent = "Checkout";
  }
});

$("#newsletter").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!LIVE) { form.reset(); return toast("Thanks for subscribing (demo)"); }
  try {
    const res = await fetch(`${CFG.supabaseUrl}/rest/v1/subscribers`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: CFG.supabaseAnonKey, Prefer: "return=minimal" },
      body: JSON.stringify({ email: $("#email").value.trim().toLowerCase() }),
    });
    if (res.status === 409) toast("You are already subscribed");
    else if (!res.ok) throw new Error();
    else toast("Thanks for subscribing");
    form.reset();
  } catch {
    toast("Could not subscribe. Please try again.");
  }
});

/* ---------- Init ---------- */
$("#year").textContent = new Date().getFullYear();
renderProducts();
renderBuilder();
renderCart();
if (PAYMENT_LINK_MODE) $("#cartOpen").remove();

/* Back from Stripe */
const params = new URLSearchParams(location.search);
if (params.has("paid")) {
  cart = [];
  saveCart();
  toast("Thank you! Your order is confirmed.");
} else if (params.has("cancelled")) {
  toast("Payment cancelled. Your basket is saved.");
}
if (params.has("paid") || params.has("cancelled")) history.replaceState(null, "", location.pathname);
