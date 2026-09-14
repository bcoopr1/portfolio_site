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
    slug: "less-lethal-drone",
    title: "Less Than Lethal UAS Solution",
    date: "2026-09-14",
    tag: "Project",
    summary: "A first proof of concept exploring whether a compact drone could give an officer another option — and being clear about what I can’t yet demonstrate.",
    body: [
      "This project started with a question: could a small drone have a useful role in less-lethal intervention?",
      "I’m interested in the space between drones used for observation and larger platforms designed to carry substantial payloads. My longer-term idea is a compact drone that could give an officer another option for responding to an armed threat while operating from a more protected location. Whether that idea is practical remains an open question, and this project is my first attempt to explore it.",
      "The general concept is not new. In June 2022, Axon announced that it had begun developing a “non-lethal, remotely-operated TASER drone system.” That announcement establishes that the company explored this direction; it does not establish the broad patent restriction I initially understood it to have. For this post, I’m leaving the patent question open rather than making a claim I cannot substantiate. Source: Axon’s June 2022 announcement.",
      "The platform I have in mind would be roughly the size of a GEPRC 3.5-inch cinewhoop. At a conceptual level, it would carry an electrically incapacitating device. I’m also interested in autonomous flight capabilities, with a human operator retaining control during critical moments and the ability to pilot the aircraft directly.",
      { img: "images/example_POC.png", alt: "Early proof-of-concept prototype", side: "right", caption: "Proof of concept" },
      "The motivation is to explore whether physical distance could help protect an officer responding to a dangerous situation. An officer might operate from a patrol vehicle or another protected position rather than immediately approaching an armed individual. That is the intended use case, not a capability I have demonstrated.",
      "For this first proof of concept, I plan to use the drones I already have: my BETAFPV Meteor 75mm and Rotor Riot Vision40. My Meteor uses analog video, while my Vision40 uses a Walksnail video system. Both are small platforms, and I currently run them on 1S 650 mAh batteries.",
      "This initial version will not include an energized electrical payload. I also haven’t established the power requirements of a future electrical system, so I cannot yet draw a firm conclusion about whether a particular battery configuration would support it.",
      "At this stage, the project is an early prototype with substantial unanswered questions. Its size, handling, durability, and overall feasibility still need to be understood. Even a functioning mechanical demonstration would not establish that the broader concept could safely or reliably incapacitate someone.",
      "This is the starting point for the blog: documenting the idea, the limits of the current prototype, and what I learn as the project develops. I want to be clear about the difference between what I hope to achieve and what I can actually demonstrate."
    ]
  }

];
