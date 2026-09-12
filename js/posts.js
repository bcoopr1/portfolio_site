/* ─────────────────────────────────────────────────────────────
   BLOG POSTS — this is the only file you edit to publish.

   To add a post, copy one object below, paste it at the TOP of the
   array (newest first), and fill it in. Fields:

     slug     unique, url-safe id. Becomes post.html?slug=THIS.
              lowercase, dashes-between-words, no spaces.
     title    the post headline.
     date     "YYYY-MM-DD". The list sorts newest-first by this.
     tag      short label (e.g. "Update", "Project", "Note").
     summary  one line shown on the blog index row.
     body     array of paragraphs — each string becomes one <p>.

   For a richer post (headings, lists, links) use `bodyHtml`
   instead of `body`: a single HTML string, used as-is. See the
   "hello-world" example.
   ───────────────────────────────────────────────────────────── */

window.BLOG_POSTS = [

  {
    slug: "hello-world",
    title: "Starting a blog",
    date: "2026-08-30",
    tag: "Update",
    summary: "Why this section exists and what I’ll be posting here.",
    bodyHtml:
      "<p>I added this space to post updates as I build — new projects, things " +
      "I’m learning, and the occasional write-up. It’s wired to a single data " +
      "file, so publishing is just adding an entry.</p>" +
      "<p>Expect notes on:</p>" +
      "<ul>" +
      "<li>Autonomous systems and the drones I’m prototyping</li>" +
      "<li>Security, self-hosting, and my homelab</li>" +
      "<li>Client work through Cooper Designs</li>" +
      "</ul>" +
      "<p>More soon.</p>"
  },

  {
    slug: "example-post",
    title: "An example post",
    date: "2026-08-15",
    tag: "Note",
    summary: "A second entry so you can see how the list stacks up.",
    body: [
      "This is a plain-text post. Each string in the “body” array becomes its own paragraph, so you can write naturally without touching any HTML.",
      "Delete this entry whenever you like — it’s only here to show the layout with more than one post. Copy either example to start your own."
    ]
  }

];
