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
    slug: "usv-1-scale-model-print",
    title: "USV-1 in the flesh!",
    date: "2026-09-20",
    tag: "Update",
    summary: "A quarter-scale test print to check buoyancy and assembly. It went together, but it came out too container-ship. Next revision goes after the Mark VI.",
    body: [
      "To test my model, to see if it would float or even be able to be assembled, I printed a scale model at 25% of the original scale. All the same parts, just scaled down.",
      {
        img: "images/partslist.jpg",
        alt: "All of the printed 25% scale parts laid out together.",
        side: "right",
        caption: "First Plate"
      },
      "First impressions: the first plate printed very well. The four hull segments, the deck, and the bulkheads all came out exceptionally well, aside from a leveling issue on my end. The next plate was the hull straps, the mast, and the spine for the deck. Those came out well except for the straps, which were too thin to print accurately on a 0.4 mm nozzle.",
      "Assembled, the pieces fit together pretty well. But because of the leveling issue, some part tops weren't flush. They sat slightly angled, which added misalignment down the line. From the photos you can tell it's pretty container-ship-like. That's not what I want, I'm now realizing. It looks a little unstable in the water.",
      {
        img: "images/Broadside.jpg",
        alt: "Broadside view of the assembled 25% scale hull.",
        side: "full"
      },
      "For the next revision I'm modeling the boat closer to the Mark VI SOC naval boat: sleek, modern-ish, fast, and stable. That hull looks like it cuts through water faster and more efficiently than this one.",
      {
        pair: [
          { img: "images/front.jpg", alt: "Head-on view of the assembled scale model." },
          { img: "images/frontangle.jpg", alt: "Three-quarter front view of the assembled scale model." }
        ]
      },
      "It's pretty nice to be able to draft a prototype frame, model it, print it, and revise it again inside a week. Rapid prototyping is the baseline now. I just bought 5 kg of orange PETG for the final model, whenever that comes around.",
      "Stay tuned for more updates."
    ]
  },

  {
    slug: "usv-1-assembly",
    title: "USV 1 — Assembly Explorer",
    date: "2026-09-17",
    tag: "Project",
    summary: "An interactive 3D breakdown of the USV 1 build — drag to orbit the model, and click any part to inspect it.",
    bodyHtml:
      "<p><strong>Purpose:</strong> Build an autonomous unmanned surface vessel (USV) " +
      "to navigate Belmont Harbor on Lake Michigan. The boat will be driven by an " +
      "electric motor and controlled by ArduPilot. A Raspberry Pi 5 running computer " +
      "vision (CV) will handle obstacle detection and avoidance. The plan is to set a " +
      "route through the marina in ArduPilot and have the CV system steer the boat " +
      "safely around the mooring docks and boats in the harbor. The hull will be fully " +
      "3D printed. The goal is to complete a working proof of concept within one month.</p>" +
      "<p>Below is an interactive assembly explorer for USV 1. Drag to orbit the " +
      "model, scroll to zoom, and select any component to see its details. It runs " +
      "entirely in your browser — no plugins, nothing to install.</p>" +
      "<div class=\"post-embed\">" +
      "<iframe src=\"USV_I1_inward_viewer.html\" title=\"USV 1 — assembly explorer\" " +
      "loading=\"lazy\" allowfullscreen></iframe>" +
      "</div>" +
      "<p><a href=\"USV_I1_inward_viewer.html\" target=\"_blank\" rel=\"noopener\">" +
      "Open the full-screen explorer ↗</a></p>"
  },

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
      "The motivation is to explore whether physical distance could help protect an officer responding to a dangerous situation. An officer might operate from a patrol vehicle or another protected position rather than immediately approaching an armed individual. That is the intended use case, not a capability I have demonstrated.",
      "For this first proof of concept, I plan to use the drones I already have: my BETAFPV Meteor 75mm and Rotor Riot Vision40. My Meteor uses analog video, while my Vision40 uses a Walksnail video system. Both are small platforms, and I currently run them on 1S 650 mAh batteries.",
      "This initial version will not include an energized electrical payload. I also haven’t established the power requirements of a future electrical system, so I cannot yet draw a firm conclusion about whether a particular battery configuration would support it.",
      "At this stage, the project is an early prototype with substantial unanswered questions. Its size, handling, durability, and overall feasibility still need to be understood. Even a functioning mechanical demonstration would not establish that the broader concept could safely or reliably incapacitate someone.",
      "This is the starting point for the blog: documenting the idea, the limits of the current prototype, and what I learn as the project develops. I want to be clear about the difference between what I hope to achieve and what I can actually demonstrate."
    ]
  }

];
