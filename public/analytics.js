// yzrs-times 共通アナリティクス
// 使い方: 下の ID を GA4 の測定ID (G-XXXXXXXXXX) に書き換えるだけ。
// 全ページがこのファイルを読み込んでいるので、ここ1か所の変更で計測が有効になる。
// 未設定 (XXXX のまま) の間は何もしない安全設計。
(function () {
  var ID = "G-56D3SSB529";
  if (ID.indexOf("XXXX") > -1) return; // 未設定なら no-op
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", ID);

  var APP_HOST = "apps.yzrswork.com";
  var ROUTE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  document.addEventListener("click", function (event) {
    var target = event.target;
    var link = target && typeof target.closest === "function" ? target.closest("a[href]") : null;
    if (!link) return;

    var url;
    try {
      url = new URL(link.href, document.baseURI || "https://yzrswork.com/");
    } catch (_) {
      return;
    }

    if (url.protocol !== "https:" || url.hostname !== APP_HOST) return;

    var routeKeys = url.searchParams.getAll("yzrs_ref");
    var routeKey = routeKeys.length === 1 ? routeKeys[0] : "";
    if (!routeKey || routeKey.length > 64 || !ROUTE_KEY_PATTERN.test(routeKey)) return;

    var pathSegments = url.pathname.split("/").filter(Boolean);
    var toolSlug = pathSegments[0] || "root";
    gtag("event", "tool_link_click", {
      route_key: routeKey,
      tool_slug: toolSlug,
      destination_path: url.pathname,
    });
  });
})();
