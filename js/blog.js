/* Blog renderer — reads window.BLOG_POSTS (from js/posts.js) and renders
   the index list (blog.html) and single posts (post.html?slug=…).

   Runs synchronously at end of <body>, before main.js, so the injected
   rows/post exist when main.js wires up its scroll + entrance animations. */
(function () {
  'use strict';

  var posts = (window.BLOG_POSTS || []).slice().sort(function (a, b) {
    return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; // newest first
  });

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function yearOf(date) { return (date || '').slice(0, 4); }

  function longDate(date) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
    if (!m) return date || '';
    return (MONTHS[parseInt(m[2], 10) - 1] || '') + ' ' +
      parseInt(m[3], 10) + ', ' + m[1];
  }

  // A body entry is either a plain-text paragraph (string) or an image figure
  // object: { img: "images/x.png", alt: "...", side: "right"|"left", caption: "..." }.
  // Place a figure object just before the paragraph it should sit beside — the
  // following text wraps around the float.
  function figure(item) {
    var side = item.side === 'left' ? 'left' : 'right';
    var cap = item.caption
      ? '<figcaption class="post-figure__caption">' + esc(item.caption) + '</figcaption>'
      : '';
    return '<figure class="post-figure post-figure--' + side + '">' +
      '<img src="' + esc(item.img) + '" alt="' + esc(item.alt || '') + '" />' +
      cap + '</figure>';
  }

  // bodyHtml is author-controlled rich HTML (used as-is); body is an array of
  // paragraphs and/or figure objects.
  function renderBody(post) {
    if (post.bodyHtml) return post.bodyHtml;
    return (post.body || []).map(function (item) {
      if (item && typeof item === 'object') {
        return item.img ? figure(item) : '';
      }
      return '<p>' + esc(item) + '</p>';
    }).join('');
  }

  function getSlug() {
    // Prefer the hash (survives file:// reliably); fall back to ?slug= query.
    var h = (window.location.hash || '').replace(/^#/, '');
    if (h) return decodeURIComponent(h);
    var m = /[?&]slug=([^&]*)/.exec(window.location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
  }

  function renderList(el) {
    if (!posts.length) {
      el.innerHTML = '<p class="text-muted" style="padding:2rem 0;">No posts yet.</p>';
      return;
    }
    el.innerHTML = posts.map(function (post, i) {
      return '<a href="post.html#' + encodeURIComponent(post.slug) + '" class="project-list__row">' +
        '<span class="project-list__index">' + pad2(i + 1) + '</span>' +
        '<span class="project-list__name">' + esc(post.title) + '</span>' +
        '<span class="project-list__desc">' + esc(post.summary) + '</span>' +
        '<span class="project-list__role">' + esc(post.tag) + '</span>' +
        '<span class="project-list__year">' + esc(yearOf(post.date)) + '</span>' +
        '<span class="project-list__arrow">→</span>' +
        '</a>';
    }).join('');
  }

  function renderPost(el) {
    var slug = getSlug();
    var post = null;
    for (var i = 0; i < posts.length; i++) {
      if (posts[i].slug === slug) { post = posts[i]; break; }
    }

    if (!post) {
      document.title = 'Post not found - Beau Cooper';
      el.innerHTML =
        '<a href="blog.html" class="project-detail__back">← All posts</a>' +
        '<h1 class="project-detail__title">Post not found</h1>' +
        '<div class="project-detail__desc"><p>That post doesn’t exist or may have ' +
        'been moved. <a href="blog.html">Back to the blog</a>.</p></div>';
      return;
    }

    document.title = post.title + ' - Beau Cooper';
    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && post.summary) metaDesc.setAttribute('content', post.summary);

    el.innerHTML =
      '<a href="blog.html" class="project-detail__back">← All posts</a>' +
      '<h1 class="project-detail__title">' + esc(post.title) + '</h1>' +
      '<p class="project-detail__meta">' + esc(longDate(post.date)) +
      (post.tag ? ' · ' + esc(post.tag) : '') + '</p>' +
      '<div class="project-detail__desc">' + renderBody(post) + '</div>';
  }

  var listEl = document.getElementById('blog-list');
  if (listEl) renderList(listEl);

  var postEl = document.getElementById('blog-post');
  if (postEl) renderPost(postEl);
})();
