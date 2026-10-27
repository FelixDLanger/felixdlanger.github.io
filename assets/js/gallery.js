/*
  Photo viewer for beyond.html. Without JavaScript, or in a browser without <dialog>,
  each thumbnail is a plain link to the full image, so nothing breaks.
*/
(function () {
  "use strict";

  var grid = document.querySelector("[data-gallery]");
  var dialog = document.querySelector("dialog.lightbox");
  if (!grid || !dialog || typeof dialog.showModal !== "function") return;

  var links = Array.prototype.slice.call(grid.querySelectorAll("a.photo"));
  if (!links.length) return;

  var img = dialog.querySelector("[data-lb-img]");
  var caption = dialog.querySelector("[data-lb-caption]");
  var pos = dialog.querySelector("[data-lb-pos]");
  var stage = dialog.querySelector("[data-lb-stage]");
  var index = 0;
  var opener = null;
  var swipeX = null;
  var swiped = false;

  function show(i) {
    index = (i + links.length) % links.length;
    var link = links[index];
    var thumb = link.querySelector("img");
    img.src = link.getAttribute("href");
    img.alt = thumb ? thumb.alt : "";
    caption.textContent = img.alt;
    pos.textContent = (index + 1) + " of " + links.length;
    [index + 1, index - 1].forEach(function (k) {
      var pre = new Image();
      pre.src = links[(k + links.length) % links.length].getAttribute("href");
    });
  }

  grid.addEventListener("click", function (e) {
    var link = e.target.closest("a.photo");
    if (!link || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    opener = link;
    show(links.indexOf(link));
    dialog.showModal();
  });

  dialog.addEventListener("click", function (e) {
    if (swiped) { swiped = false; return; }
    var action = e.target.closest("[data-lb]");
    if (action) {
      var a = action.getAttribute("data-lb");
      if (a === "prev") show(index - 1);
      else if (a === "next") show(index + 1);
      else dialog.close();
      return;
    }
    if (e.target === stage) dialog.close();
  });

  dialog.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { e.preventDefault(); show(index + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); show(index - 1); }
  });

  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
    if (opener) opener.focus();
  });

  stage.addEventListener("pointerdown", function (e) {
    if (e.pointerType === "mouse") return;
    swipeX = e.clientX;
  });
  stage.addEventListener("pointerup", function (e) {
    if (swipeX === null) return;
    var dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 48) { swiped = true; show(index + (dx < 0 ? 1 : -1)); }
  });
  stage.addEventListener("pointercancel", function () { swipeX = null; });
})();
