import os
import cairosvg

OUTPUT_DIR = "public"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def wrap_medallion(id_name, bg_grad_start, bg_grad_end, rim_color, content_svg):
    return f"""<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bg_{id_name}" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="{bg_grad_start}" />
      <stop offset="100%" stop-color="{bg_grad_end}" />
    </radialGradient>

    <!-- Outer Rim Gold Gradient -->
    <linearGradient id="rim_{id_name}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff176" />
      <stop offset="40%" stop-color="{rim_color}" />
      <stop offset="100%" stop-color="#b7791f" />
    </linearGradient>

    <!-- Inner Soft Shadow -->
    <radialGradient id="inner_shade_{id_name}" cx="50%" cy="50%" r="50%">
      <stop offset="80%" stop-color="#000000" stop-opacity="0" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.45" />
    </radialGradient>

    <!-- Soft Ambient Glow Filter -->
    <filter id="glow_{id_name}" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.35" />
    </filter>
  </defs>

  <!-- Clip to Perfect Circle -->
  <clipPath id="circle_clip_{id_name}">
    <circle cx="256" cy="256" r="236" />
  </clipPath>

  <!-- Group with Drop Shadow -->
  <g>
    <!-- Outer Golden / Accent Rim -->
    <circle cx="256" cy="256" r="248" fill="url(#rim_{id_name})" stroke="#78350f" stroke-width="5" />
    <circle cx="256" cy="256" r="238" fill="none" stroke="#ffffff" stroke-width="3" stroke-opacity="0.75" />

    <!-- Medallion Base Body -->
    <g clip-path="url(#circle_clip_{id_name})">
      <circle cx="256" cy="256" r="236" fill="url(#bg_{id_name})" />
      <circle cx="256" cy="256" r="236" fill="url(#inner_shade_{id_name})" />

      <!-- Minimalist Activity Artwork -->
      <g filter="url(#glow_{id_name})">
        {content_svg}
      </g>
    </g>

    <!-- Inner Accent Border -->
    <circle cx="256" cy="256" r="236" fill="none" stroke="{rim_color}" stroke-width="4" stroke-opacity="0.8" />
  </g>
</svg>"""

LOGOS = {
    # 1. SHAPE NEST (Geometry): Golden Amber bg, Red Triangle, Yellow Circle, Blue Square
    "portal-shape-nest.png": wrap_medallion(
        "shape_nest",
        "#f59e0b",
        "#b45309",
        "#fde047",
        """
        <!-- Wooden Nest Base Tray -->
        <rect x="116" y="136" width="280" height="240" rx="48" fill="#451a03" stroke="#ffd166" stroke-width="7" />
        <rect x="126" y="146" width="260" height="220" rx="38" fill="#271005" />

        <!-- 1. Top Center: Crimson Red Triangle -->
        <polygon points="256,160 326,270 186,270" fill="#ef4444" stroke="#ffffff" stroke-width="8" stroke-linejoin="round" />
        <polygon points="256,178 308,260 204,260" fill="#dc2626" />

        <!-- 2. Bottom Left: Sunny Yellow Circle -->
        <circle cx="196" cy="308" r="42" fill="#facc15" stroke="#ffffff" stroke-width="8" />
        <circle cx="196" cy="308" r="30" fill="#eab308" />

        <!-- 3. Bottom Right: Azure Blue Square -->
        <rect x="274" y="266" width="84" height="84" rx="14" fill="#3b82f6" stroke="#ffffff" stroke-width="8" />
        <rect x="284" y="276" width="64" height="64" rx="8" fill="#2563eb" />

        <!-- Central Sparkle -->
        <circle cx="256" cy="270" r="10" fill="#ffffff" />
        """
    ),

    # 2. COLOR BLOOM (Colors): Fresh Spring Green bg, 6 Rainbow Petals, Glowing Core
    "portal-color-bloom.png": wrap_medallion(
        "color_bloom",
        "#10b981",
        "#047857",
        "#86efac",
        """
        <!-- 6 Saturated Rainbow Flower Petals -->
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#ef4444" stroke="#ffffff" stroke-width="7" transform="rotate(0 256 256)" />
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#f97316" stroke="#ffffff" stroke-width="7" transform="rotate(60 256 256)" />
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#facc15" stroke="#ffffff" stroke-width="7" transform="rotate(120 256 256)" />
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#22c55e" stroke="#ffffff" stroke-width="7" transform="rotate(180 256 256)" />
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#06b6d4" stroke="#ffffff" stroke-width="7" transform="rotate(240 256 256)" />
        <ellipse cx="256" cy="148" rx="44" ry="76" fill="#a855f7" stroke="#ffffff" stroke-width="7" transform="rotate(300 256 256)" />

        <!-- Outer Pistil Ring -->
        <circle cx="256" cy="256" r="64" fill="#ffffff" />
        <circle cx="256" cy="256" r="54" fill="#fbbf24" stroke="#f59e0b" stroke-width="6" />

        <!-- Core Dewdrop Gleam -->
        <ellipse cx="242" cy="242" rx="14" ry="8" fill="#ffffff" transform="rotate(-30 242 242)" />
        """
    ),

    # 3. PHONICS POND (Language & Sounds): Deep Marine Blue bg, Lily pad, Ripples, Musical Note
    "portal-phonics-pond.png": wrap_medallion(
        "phonics_pond",
        "#0284c7",
        "#075985",
        "#7dd3fc",
        """
        <!-- Concentric Water Ripples -->
        <ellipse cx="256" cy="310" rx="180" ry="70" fill="none" stroke="#38bdf8" stroke-width="6" stroke-opacity="0.5" />
        <ellipse cx="256" cy="310" rx="130" ry="50" fill="none" stroke="#7dd3fc" stroke-width="7" stroke-opacity="0.75" />
        <ellipse cx="256" cy="310" rx="80" ry="32" fill="none" stroke="#ffffff" stroke-width="8" />

        <!-- Green Lily Pad -->
        <path d="M 120,300 C 120,335 240,355 310,330 C 370,305 350,270 300,265 C 270,260 256,290 250,290 C 244,290 220,260 180,265 C 130,270 120,285 120,300 Z"
              fill="#15803d" stroke="#4ade80" stroke-width="7" />

        <!-- Water Lily Flower -->
        <ellipse cx="190" cy="280" rx="22" ry="14" fill="#f472b6" stroke="#ffffff" stroke-width="4" />
        <circle cx="190" cy="280" r="7" fill="#fde047" />

        <!-- Luminous White Musical Beamed Notes -->
        <g transform="translate(20, -20)">
          <ellipse cx="220" cy="230" rx="24" ry="18" fill="#ffffff" stroke="#0284c7" stroke-width="4" transform="rotate(-20 220 230)" />
          <ellipse cx="300" cy="205" rx="24" ry="18" fill="#ffffff" stroke="#0284c7" stroke-width="4" transform="rotate(-20 300 205)" />

          <rect x="234" y="110" width="12" height="116" rx="6" fill="#ffffff" />
          <rect x="314" y="85" width="12" height="116" rx="6" fill="#ffffff" />

          <polygon points="234,110 326,85 326,115 234,140" fill="#ffffff" />
          <polygon points="345,75 350,85 360,90 350,95 345,105 340,95 330,90 340,85" fill="#fde047" />
        </g>
        """
    ),

    # 4. CREATURE LADDER (Sizes & Comparison): Royal Purple bg, 3 Ascending Size Blocks
    "portal-creature-ladder.png": wrap_medallion(
        "creature_ladder",
        "#7c3aed",
        "#4c1d95",
        "#c4b5fd",
        """
        <!-- Wood ladder stand / base ground -->
        <rect x="100" y="370" width="312" height="24" rx="12" fill="#5b21b6" stroke="#a78bfa" stroke-width="4" />

        <!-- 3 Ascending Size Blocks -->
        <!-- Small Block (Height 60, Width 70) -->
        <g transform="translate(110, 290)">
          <rect x="0" y="0" width="76" height="80" rx="18" fill="#ec4899" stroke="#ffffff" stroke-width="7" />
          <circle cx="38" cy="40" r="14" fill="#ffffff" />
          <text x="38" y="47" font-size="20" font-weight="900" fill="#ec4899" text-anchor="middle">1</text>
        </g>

        <!-- Medium Block (Height 120, Width 76) -->
        <g transform="translate(218, 230)">
          <rect x="0" y="0" width="76" height="140" rx="18" fill="#f59e0b" stroke="#ffffff" stroke-width="7" />
          <circle cx="38" cy="40" r="14" fill="#ffffff" />
          <text x="38" y="47" font-size="20" font-weight="900" fill="#f59e0b" text-anchor="middle">2</text>
        </g>

        <!-- Large Block (Height 180, Width 76) -->
        <g transform="translate(326, 170)">
          <rect x="0" y="0" width="76" height="200" rx="18" fill="#10b981" stroke="#ffffff" stroke-width="7" />
          <circle cx="38" cy="40" r="14" fill="#ffffff" />
          <text x="38" y="47" font-size="20" font-weight="900" fill="#10b981" text-anchor="middle">3</text>
        </g>

        <!-- Dynamic Size Arrow Arc over steps -->
        <path d="M 148,270 Q 256,140 364,150" fill="none" stroke="#fde047" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 10" />
        <polygon points="376,152 354,140 360,166" fill="#fde047" />
        """
    ),

    # 5. PATTERN PATH (Patterns & Sequences): Coral Orange bg, Alternating Stepping Stones A-B-A-B
    "portal-pattern-path.png": wrap_medallion(
        "pattern_path",
        "#ea580c",
        "#9a3412",
        "#fed7aa",
        """
        <!-- Winding Forest Trail Path -->
        <path d="M 100,340 C 180,330 180,240 256,230 C 330,220 330,150 390,130"
              fill="none" stroke="#7c2d12" stroke-width="52" stroke-linecap="round" />
        <path d="M 100,340 C 180,330 180,240 256,230 C 330,220 330,150 390,130"
              fill="none" stroke="#fed7aa" stroke-width="40" stroke-linecap="round" stroke-opacity="0.3" />

        <!-- 4 Stepping Stones in Clear Pattern: Red, Cyan, Red, Cyan -->
        <!-- Stone 1: Red -->
        <circle cx="120" cy="336" r="32" fill="#ef4444" stroke="#ffffff" stroke-width="7" />
        <circle cx="120" cy="336" r="14" fill="#ffffff" opacity="0.6" />

        <!-- Stone 2: Cyan -->
        <circle cx="204" cy="272" r="32" fill="#06b6d4" stroke="#ffffff" stroke-width="7" />
        <circle cx="204" cy="272" r="14" fill="#ffffff" opacity="0.6" />

        <!-- Stone 3: Red -->
        <circle cx="288" cy="214" r="32" fill="#ef4444" stroke="#ffffff" stroke-width="7" />
        <circle cx="288" cy="214" r="14" fill="#ffffff" opacity="0.6" />

        <!-- Stone 4: Cyan -->
        <circle cx="368" cy="154" r="32" fill="#06b6d4" stroke="#ffffff" stroke-width="7" />
        <circle cx="368" cy="154" r="14" fill="#ffffff" opacity="0.6" />

        <!-- Destination Golden Star at path end -->
        <polygon points="410,105 418,124 438,126 422,140 428,160 410,148 392,160 398,140 382,126 402,124"
                 fill="#fde047" stroke="#ffffff" stroke-width="4" />
        """
    ),

    # 6. SHADOW MATCH (Observation): Deep Midnight Indigo bg, Golden Searchlight, White Silhouette
    "portal-shadow-match.png": wrap_medallion(
        "shadow_match",
        "#1e1b4b",
        "#0f172a",
        "#a5b4fc",
        """
        <!-- Background Stars -->
        <circle cx="140" cy="150" r="4" fill="#fde047" />
        <circle cx="380" cy="140" r="5" fill="#fde047" />
        <circle cx="390" cy="330" r="4" fill="#fde047" />
        <circle cx="120" cy="310" r="5" fill="#fde047" />

        <!-- Golden Searchlight Cone from top-left -->
        <polygon points="110,110 420,230 350,420" fill="#fde047" fill-opacity="0.32" />
        <polygon points="110,110 390,260 320,400" fill="#ffffff" fill-opacity="0.18" />

        <!-- Flashlight / Lantern in corner -->
        <g transform="translate(100, 100) rotate(45)">
          <rect x="-16" y="0" width="32" height="54" rx="8" fill="#475569" stroke="#94a3b8" stroke-width="4" />
          <path d="M -26,0 L 26,0 L 20,-20 L -20,-20 Z" fill="#f59e0b" stroke="#ffffff" stroke-width="4" />
          <ellipse cx="0" cy="-20" rx="20" ry="7" fill="#fde047" />
        </g>

        <!-- Sharp White Rabbit Silhouette in the Spotlight -->
        <g transform="translate(230, 210)">
          <!-- Rabbit Shadow Silhouette on ground -->
          <ellipse cx="40" cy="140" rx="60" ry="18" fill="#020617" opacity="0.6" />

          <!-- Left Ear -->
          <path d="M 20,40 C 10,-20 35,-45 42,-45 C 50,-45 52,-10 38,40 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="4" />
          <!-- Right Ear -->
          <path d="M 44,40 C 44,-25 68,-50 78,-45 C 86,-40 80,-5 58,40 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="4" />

          <!-- Body & Head -->
          <ellipse cx="40" cy="80" rx="46" ry="42" fill="#ffffff" stroke="#94a3b8" stroke-width="5" />
          <ellipse cx="40" cy="120" rx="54" ry="38" fill="#ffffff" stroke="#94a3b8" stroke-width="5" />

          <!-- Cute Eye & Nose Details -->
          <circle cx="28" cy="74" r="5" fill="#1e1b4b" />
          <circle cx="52" cy="74" r="5" fill="#1e1b4b" />
          <polygon points="40,84 35,90 45,90" fill="#f43f5e" />

          <!-- Little Paw -->
          <ellipse cx="10" cy="130" rx="14" ry="10" fill="#ffffff" stroke="#94a3b8" stroke-width="3" />
        </g>
        """
    ),

    # 7. NATURE SORTING (Science & Categories): Autumn Hazelnut / Ochre bg, Wicker Basket & Produce
    "portal-nature-sorting.png": wrap_medallion(
        "nature_sorting",
        "#b45309",
        "#78350f",
        "#fde68a",
        """
        <!-- Large Woven Harvest Basket -->
        <!-- Basket Handle -->
        <path d="M 150,250 C 150,140 362,140 362,250" fill="none" stroke="#78350f" stroke-width="22" stroke-linecap="round" />
        <path d="M 150,250 C 150,140 362,140 362,250" fill="none" stroke="#f59e0b" stroke-width="12" stroke-linecap="round" />

        <!-- Woven Basket Body -->
        <path d="M 136,250 L 166,370 Q 256,394 346,370 L 376,250 Z"
              fill="#92400e" stroke="#fde68a" stroke-width="8" stroke-linejoin="round" />

        <!-- Wicker Cross Slats -->
        <path d="M 150,270 L 330,370 M 170,250 L 350,350 M 362,270 L 182,370 M 342,250 L 162,350"
              stroke="#b45309" stroke-width="6" stroke-linecap="round" />

        <!-- Basket Rim -->
        <rect x="124" y="236" width="264" height="26" rx="12" fill="#d97706" stroke="#ffffff" stroke-width="6" />

        <!-- 3 Woodland Treasures overflowing from the Basket: -->
        <!-- 1. Emerald Green Oak Leaf (left) -->
        <g transform="translate(160, 190) rotate(-28)">
          <path d="M 0,0 C -30,-40 -50,-20 -60,10 C -40,30 -20,20 0,0 Z" fill="#22c55e" stroke="#ffffff" stroke-width="6" />
          <path d="M 0,0 C -25,-5 -45,5 -56,10" stroke="#86efac" stroke-width="3" fill="none" />
        </g>

        <!-- 2. Shiny Red Apple (center) -->
        <g transform="translate(256, 210)">
          <circle cx="0" cy="0" r="38" fill="#ef4444" stroke="#ffffff" stroke-width="6" />
          <ellipse cx="-12" cy="-12" rx="10" ry="6" fill="#ffffff" opacity="0.6" transform="rotate(-30 -12 -12)" />
          <path d="M 0,-38 Q 8,-50 14,-54" stroke="#78350f" stroke-width="5" fill="none" />
          <ellipse cx="14" cy="-50" rx="10" ry="6" fill="#86efac" stroke="#ffffff" stroke-width="2" transform="rotate(30 14 -50)" />
        </g>

        <!-- 3. Sparkling Blue Quartz Gem (right) -->
        <g transform="translate(325, 210) rotate(18)">
          <polygon points="0,-32 26,-8 16,30 -16,30 -26,-8" fill="#38bdf8" stroke="#ffffff" stroke-width="6" stroke-linejoin="round" />
          <polygon points="0,-32 16,30 -16,30" fill="#0ea5e9" opacity="0.5" />
          <circle cx="0" cy="-6" r="4" fill="#ffffff" />
        </g>
        """
    ),

    # 8. SYMMETRY WINGS (Art & Symmetry): Twilight Magenta bg, Symmetrical Split Butterfly
    "portal-symmetry-wings.png": wrap_medallion(
        "symmetry_wings",
        "#db2777",
        "#831843",
        "#fbcfe8",
        """
        <!-- Butterfly Center Body -->
        <rect x="250" y="170" width="12" height="150" rx="6" fill="#1e1b4b" stroke="#ffffff" stroke-width="3" />
        <circle cx="256" cy="165" r="14" fill="#1e1b4b" stroke="#ffffff" stroke-width="3" />

        <!-- Symmetrical Antennae -->
        <path d="M 250,154 Q 220,110 206,120" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
        <circle cx="206" cy="120" r="6" fill="#fde047" />

        <path d="M 262,154 Q 292,110 306,120" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" />
        <circle cx="306" cy="120" r="6" fill="#fde047" />

        <!-- Left Wing (Luminous Cyan #38bdf8) -->
        <g transform="translate(250, 240)">
          <path d="M 0,-60 C -80,-140 -170,-90 -160,0 C -150,50 -70,20 0,-10 Z"
                fill="#38bdf8" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" />
          <circle cx="-90" cy="-45" r="18" fill="#fde047" stroke="#ffffff" stroke-width="4" />
          <circle cx="-130" cy="-20" r="10" fill="#ffffff" />

          <path d="M 0,0 C -70,30 -130,80 -100,120 C -70,140 -30,90 0,20 Z"
                fill="#0284c7" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" />
          <circle cx="-65" cy="80" r="12" fill="#fde047" stroke="#ffffff" stroke-width="3" />
        </g>

        <!-- Right Wing (Mirrored Gold #fbbf24 for artistic symmetry) -->
        <g transform="translate(262, 240)">
          <path d="M 0,-60 C 80,-140 170,-90 160,0 C 150,50 70,20 0,-10 Z"
                fill="#fbbf24" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" />
          <circle cx="90" cy="-45" r="18" fill="#38bdf8" stroke="#ffffff" stroke-width="4" />
          <circle cx="130" cy="-20" r="10" fill="#ffffff" />

          <path d="M 0,0 C 70,30 130,80 100,120 C 70,140 30,90 0,20 Z"
                fill="#f59e0b" stroke="#ffffff" stroke-width="7" stroke-linejoin="round" />
          <circle cx="65" cy="80" r="12" fill="#38bdf8" stroke="#ffffff" stroke-width="3" />
        </g>

        <!-- Mirror Axis Sparkle Line -->
        <line x1="256" y1="90" x2="256" y2="400" stroke="#fde047" stroke-width="3" stroke-dasharray="8 6" stroke-opacity="0.8" />
        """
    ),

    # 9. ACORN SCALE (Math / Measurement): Warm Bronze Gold bg, Balanced Scale & Acorns
    "portal-acorn-scale.png": wrap_medallion(
        "acorn_scale",
        "#ca8a04",
        "#713f12",
        "#fef08a",
        """
        <!-- Central Pillar and Base -->
        <rect x="246" y="160" width="20" height="190" rx="6" fill="#451a03" stroke="#fde047" stroke-width="4" />
        <path d="M 180,350 L 332,350 L 300,320 L 212,320 Z" fill="#451a03" stroke="#fde047" stroke-width="4" />

        <!-- Fulcrum Top Diamond -->
        <polygon points="256,130 276,160 236,160" fill="#fde047" stroke="#78350f" stroke-width="3" />
        <circle cx="256" cy="155" r="7" fill="#78350f" />

        <!-- Balance Beam -->
        <line x1="120" y1="170" x2="392" y2="170" stroke="#ffd166" stroke-width="10" stroke-linecap="round" />

        <!-- Left Scale Pan with Acorns -->
        <line x1="130" y1="170" x2="100" y2="260" stroke="#fef08a" stroke-width="3" />
        <line x1="190" y1="170" x2="220" y2="260" stroke="#fef08a" stroke-width="3" />
        <path d="M 90,260 Q 160,285 230,260 Z" fill="#78350f" stroke="#fde047" stroke-width="5" />
        <!-- Acorns in Left Pan -->
        <circle cx="145" cy="245" r="18" fill="#d97706" stroke="#ffffff" stroke-width="3" />
        <circle cx="175" cy="245" r="18" fill="#d97706" stroke="#ffffff" stroke-width="3" />

        <!-- Right Scale Pan with Forest Weight -->
        <line x1="322" y1="170" x2="292" y2="260" stroke="#fef08a" stroke-width="3" />
        <line x1="382" y1="170" x2="412" y2="260" stroke="#fef08a" stroke-width="3" />
        <path d="M 282,260 Q 352,285 422,260 Z" fill="#78350f" stroke="#fde047" stroke-width="5" />
        <!-- Stone weight in Right Pan -->
        <polygon points="352,220 376,250 328,250" fill="#64748b" stroke="#ffffff" stroke-width="4" />
        """
    ),

    # 10. RHYTHM IN THE BRANCHES (Music & Auditory): Deep Teal bg, Golden Chimes & Notes
    "portal-rhythm-branches.png": wrap_medallion(
        "rhythm_branches",
        "#0f766e",
        "#115e59",
        "#99f6e4",
        """
        <!-- Sound Waves radiating from top -->
        <path d="M 170,160 A 100,100 0 0,1 342,160" fill="none" stroke="#2dd4bf" stroke-width="6" stroke-linecap="round" stroke-dasharray="10 8" />
        <path d="M 130,140 A 150,150 0 0,1 382,140" fill="none" stroke="#5eead4" stroke-width="6" stroke-linecap="round" stroke-dasharray="14 10" />

        <!-- 3 Hanging Golden Woodland Bells / Chimes -->
        <!-- Bell 1 (Left) -->
        <line x1="180" y1="130" x2="180" y2="220" stroke="#fde047" stroke-width="4" />
        <path d="M 160,260 Q 180,210 200,260 Z" fill="#facc15" stroke="#ffffff" stroke-width="5" />
        <circle cx="180" cy="265" r="6" fill="#ea580c" />

        <!-- Bell 2 (Center - larger) -->
        <line x1="256" y1="110" x2="256" y2="200" stroke="#fde047" stroke-width="5" />
        <path d="M 226,250 Q 256,190 286,250 Z" fill="#fbbf24" stroke="#ffffff" stroke-width="6" />
        <circle cx="256" cy="256" r="8" fill="#ea580c" />

        <!-- Bell 3 (Right) -->
        <line x1="332" y1="130" x2="332" y2="220" stroke="#fde047" stroke-width="4" />
        <path d="M 312,260 Q 332,210 352,260 Z" fill="#facc15" stroke="#ffffff" stroke-width="5" />
        <circle cx="332" cy="265" r="6" fill="#ea580c" />

        <!-- Musical Note Floating Below -->
        <g transform="translate(230, 290)">
          <ellipse cx="20" cy="30" rx="18" ry="14" fill="#ffffff" transform="rotate(-20 20 30)" />
          <rect x="30" y="-20" width="8" height="50" rx="4" fill="#ffffff" />
          <path d="M 36,-20 Q 56,-25 60,-5" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" />
        </g>
        """
    ),

    # 11. CAVE ECHOES (Memory & Auditory): Deep Cave Slate bg, Glowing Arch & Sonic Echoes
    "portal-cave-echoes.png": wrap_medallion(
        "cave_echoes",
        "#374151",
        "#111827",
        "#c084fc",
        """
        <!-- Mountain / Cave Entrance Silhouette -->
        <path d="M 110,380 C 110,180 402,180 402,380 Z" fill="#030712" stroke="#a855f7" stroke-width="7" />

        <!-- Glowing Concentric Sonic Echoes from Cave -->
        <circle cx="256" cy="280" r="30" fill="none" stroke="#c084fc" stroke-width="6" />
        <circle cx="256" cy="280" r="65" fill="none" stroke="#a855f7" stroke-width="7" stroke-opacity="0.8" />
        <circle cx="256" cy="280" r="105" fill="none" stroke="#7c3aed" stroke-width="7" stroke-opacity="0.6" stroke-dasharray="14 10" />

        <!-- Friendly Bat / Glowing Echo Crystal in center -->
        <g transform="translate(256, 275)">
          <!-- Glowing Magic Crystal -->
          <polygon points="0,-45 28,-10 18,35 -18,35 -28,-10" fill="#c084fc" stroke="#ffffff" stroke-width="6" />
          <polygon points="0,-45 18,35 -18,35" fill="#f3e8ff" opacity="0.6" />
          <circle cx="0" cy="0" r="8" fill="#ffffff" />
        </g>

        <!-- Echo Sparkles -->
        <circle cx="170" cy="210" r="5" fill="#fde047" />
        <circle cx="342" cy="210" r="5" fill="#fde047" />
        <circle cx="256" cy="150" r="6" fill="#fde047" />
        """
    )
}

print(f"Generating {len(LOGOS)} minimalistic, high-contrast activity logos via CairoSVG...")
for filename, svg_content in LOGOS.items():
    out_path = os.path.join(OUTPUT_DIR, filename)
    cairosvg.svg2png(bytestring=svg_content.encode("utf-8"), write_to=out_path, output_width=512, output_height=512)
    print(f" -> Generated: {out_path} ({os.path.getsize(out_path)} bytes)")

print("All 11 activity logos successfully generated!")
