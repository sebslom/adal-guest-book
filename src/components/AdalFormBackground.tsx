import React from 'react';

// Adal Logo Vector SVG component
export const AdalLogo: React.FC<{ className?: string }> = ({ className = 'w-40 h-auto' }) => (
  <svg viewBox="0 0 220 110" className={className} fill="currentColor">
    {/* Stylized Adal text */}
    <g fill="#1a1a1a">
      {/* Letter 'A' */}
      <path d="M 22 80 L 22 42 C 22 26 36 14 52 14 C 68 14 80 26 80 42 L 80 80 L 64 80 L 64 42 C 64 33 58 27 51 27 C 44 27 38 33 38 42 L 38 80 Z" />
      <rect x="22" y="52" width="58" height="12" rx="2" />
      
      {/* Sparkle star over 'd' */}
      <path
        d="M 106 6 Q 106 18 116 18 Q 106 18 106 30 Q 106 18 96 18 Q 106 18 106 6 Z"
        fill="#1a1a1a"
      />

      {/* Letter 'd' */}
      <path d="M 100 16 L 112 16 L 112 80 L 100 80 L 100 70 C 95 78 86 82 76 82 C 60 82 48 69 48 53 C 48 37 60 24 76 24 C 86 24 95 28 100 36 Z M 98 53 C 98 43 90 36 81 36 C 72 36 64 43 64 53 C 64 63 72 70 81 70 C 90 70 98 63 98 53 Z" transform="translate(42, 0)" />

      {/* Letter 'a' */}
      <path d="M 188 44 L 188 80 L 176 80 L 176 72 C 172 78 164 82 154 82 C 141 82 131 73 131 60 C 131 46 143 38 160 38 L 176 38 L 176 37 C 176 30 170 26 161 26 C 153 26 147 29 145 33 L 135 27 C 140 19 150 14 163 14 C 180 14 188 24 188 39 Z M 176 56 L 163 56 C 153 56 147 60 147 66 C 147 71 152 74 159 74 C 169 74 176 67 176 59 Z" />

      {/* Letter 'l' */}
      <rect x="198" y="16" width="12" height="64" rx="2" />
    </g>
    {/* Subtitle 'decorations' */}
    <text
      x="110"
      y="102"
      textAnchor="middle"
      fontSize="17"
      fontWeight="400"
      letterSpacing="7"
      fill="#222"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      decorations
    </text>
  </svg>
);

interface AdalFormBackgroundProps {
  page: number; // 1 or 2
}

export const AdalFormBackground: React.FC<AdalFormBackgroundProps> = ({ page }) => {
  if (page === 1) {
    return <AdalPage1Vector />;
  }
  return <AdalPage2Vector />;
};

// =========================================================================
// PAGE 1 BACKGROUND (Vector SVG)
// =========================================================================
const AdalPage1Vector: React.FC = () => {
  return (
    <svg
      viewBox="0 0 1000 1414"
      className="w-full h-full pointer-events-none select-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* ----------------- HEADER ----------------- */}
      {/* Adal logo in top-left */}
      <g transform="translate(75, 45) scale(1.15)">
        <g fill="#111">
          {/* Logo Adal */}
          <path d="M 22 76 L 22 38 C 22 22 36 12 52 12 C 68 12 80 22 80 38 L 80 76 L 65 76 L 65 38 C 65 29 60 23 52 23 C 44 23 37 29 37 38 L 37 76 Z" />
          <rect x="22" y="48" width="58" height="11" rx="1" />
          
          {/* Sparkle star over 'd' */}
          <path d="M 125 4 Q 125 15 133 15 Q 125 15 125 26 Q 125 15 117 15 Q 125 15 125 4 Z" fill="#111" />
          <rect x="120" y="14" width="10" height="62" rx="1" />
          <circle cx="106" cy="56" r="20" fill="none" stroke="#111" strokeWidth="10" />

          {/* Letter a */}
          <path d="M 172 40 L 172 76 L 162 76 L 162 70 C 158 75 151 78 143 78 C 132 78 124 71 124 60 C 124 48 134 42 148 42 L 162 42 L 162 40 C 162 34 157 30 149 30 C 142 30 137 33 135 36 L 127 30 C 131 24 140 20 151 20 C 166 20 172 29 172 40 Z M 162 55 L 151 55 C 143 55 138 58 138 63 C 138 67 142 70 148 70 C 156 70 162 65 162 58 Z" />

          {/* Letter l */}
          <rect x="180" y="14" width="10" height="62" rx="1" />
        </g>
        <text
          x="105"
          y="98"
          textAnchor="middle"
          fontSize="14.5"
          fontWeight="400"
          letterSpacing="6"
          fill="#111"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          decorations
        </text>
      </g>

      {/* Title */}
      <text
        x="105"
        y="190"
        fontSize="34"
        fontWeight="700"
        letterSpacing="1"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        GUEST BOOK <tspan fontWeight="300">2026</tspan>
      </text>
      <text
        x="105"
        y="218"
        fontSize="17"
        fontWeight="500"
        letterSpacing="1"
        fill="#444"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        MAPIC 3 - 4.11.2026
      </text>

      {/* Top Right: PROJECT rounded rectangle */}
      <rect
        x="470"
        y="60"
        width="425"
        height="260"
        rx="16"
        fill="none"
        stroke="#555"
        strokeWidth="1.6"
      />
      <text
        x="880"
        y="306"
        textAnchor="end"
        fontSize="17"
        fontWeight="500"
        letterSpacing="1"
        fill="#777"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        PROJECT
      </text>

      {/* ----------------- FORM FIELDS ROW 1 ----------------- */}
      {/* Date */}
      <text x="105" y="370" fontSize="18" fontWeight="600" fill="#111">Date:</text>
      <line x1="155" y1="375" x2="390" y2="375" stroke="#333" strokeWidth="1.2" />

      {/* Contact Person */}
      <text x="408" y="370" fontSize="18" fontWeight="600" fill="#111">Contact Person:</text>
      <line x1="540" y1="375" x2="895" y2="375" stroke="#333" strokeWidth="1.2" />

      {/* ----------------- FORM FIELDS ROW 2 ----------------- */}
      {/* Country */}
      <text x="105" y="428" fontSize="18" fontWeight="600" fill="#111">Country:</text>
      <line x1="185" y1="433" x2="425" y2="433" stroke="#333" strokeWidth="1.2" />

      {/* Company Name */}
      <text x="442" y="428" fontSize="18" fontWeight="600" fill="#111">Company Name:</text>
      <line x1="575" y1="433" x2="895" y2="433" stroke="#333" strokeWidth="1.2" />

      {/* ----------------- FORM FIELDS ROW 3 ----------------- */}
      {/* Email */}
      <text x="105" y="485" fontSize="18" fontWeight="600" fill="#111">Email:</text>
      <line x1="160" y1="490" x2="495" y2="490" stroke="#333" strokeWidth="1.2" />

      {/* Phone */}
      <text x="512" y="485" fontSize="18" fontWeight="600" fill="#111">Phone:</text>
      <line x1="570" y1="490" x2="895" y2="490" stroke="#333" strokeWidth="1.2" />

      {/* ----------------- CATALOGUE ROW ----------------- */}
      <text x="105" y="545" fontSize="17" fontWeight="500" fill="#222">Catalogue to send:</text>
      
      {/* [ ] Digital */}
      <rect x="288" y="532" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="314" y="546" fontSize="16" fill="#333">Digital</text>

      {/* [ ] Printed */}
      <rect x="388" y="532" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="414" y="546" fontSize="16" fill="#333">Printed</text>

      {/* Separator | */}
      <line x1="480" y1="528" x2="480" y2="558" stroke="#888" strokeWidth="1.2" />

      {/* [ ] Christmas trees & greenery products */}
      <rect x="510" y="532" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="536" y="546" fontSize="16" fill="#333">Christmas trees & greenery products</text>

      {/* [ ] Decor products */}
      <rect x="774" y="532" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="800" y="546" fontSize="16" fill="#333">Decor products</text>

      {/* ----------------- ADDRESS LINES ----------------- */}
      <text x="105" y="600" fontSize="17" fontWeight="500" fill="#222">Adress line 1:</text>
      <line x1="220" y1="605" x2="895" y2="605" stroke="#333" strokeWidth="1.2" />

      <text x="105" y="656" fontSize="17" fontWeight="500" fill="#222">Adress line 2:</text>
      <line x1="220" y1="661" x2="895" y2="661" stroke="#333" strokeWidth="1.2" />

      {/* ----------------- SEASONAL DECORATIONS ----------------- */}
      <text x="105" y="714" fontSize="17" fontWeight="500" fill="#222">
        Are you insterested in seasonal decorations?
      </text>

      {/* [ ] Yes */}
      <rect x="530" y="700" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="556" y="715" fontSize="16" fill="#333">Yes</text>

      {/* [ ] No */}
      <rect x="613" y="700" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="639" y="715" fontSize="16" fill="#333">No</text>

      {/* If yes, please specify which */}
      <text x="735" y="714" fontSize="15" fontStyle="italic" fill="#555">
        If yes, please specify which
      </text>

      {/* Seasonal options row */}
      {/* Valentine's Day */}
      <rect x="110" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="136" y="765" fontSize="16" fill="#333">Valentine's Day</text>

      {/* Easter */}
      <rect x="277" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="303" y="765" fontSize="16" fill="#333">Easter</text>

      {/* Spring */}
      <rect x="417" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="443" y="765" fontSize="16" fill="#333">Spring</text>

      {/* Summer */}
      <rect x="547" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="573" y="765" fontSize="16" fill="#333">Summer</text>

      {/* Halloween */}
      <rect x="680" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="706" y="765" fontSize="16" fill="#333">Halloween</text>

      {/* Autumn */}
      <rect x="824" y="750" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="850" y="765" fontSize="16" fill="#333">Autumn</text>

      {/* ----------------- SHOWROOM VISIT ----------------- */}
      <text x="105" y="822" fontSize="17" fontWeight="500" fill="#222">
        Would you like to visit our ofice and showroom?
      </text>

      {/* [ ] Yes */}
      <rect x="530" y="808" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="556" y="823" fontSize="16" fill="#333">Yes</text>

      {/* [ ] No */}
      <rect x="613" y="808" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="639" y="823" fontSize="16" fill="#333">No</text>

      {/* Time period */}
      <text x="105" y="866" fontSize="15" fontStyle="italic" fill="#555">
        If yes, please specify a preferred time period:
      </text>
      <line x1="415" y1="872" x2="895" y2="872" stroke="#333" strokeWidth="1.2" />

      {/* ----------------- NOTES / PROJECT IDEAS ----------------- */}
      <text
        x="500"
        y="928"
        textAnchor="middle"
        fontSize="24"
        fontWeight="600"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Notes / Project Ideas
      </text>

      {/* 14 Ruled Lines for Notes */}
      {[
        970, 998, 1026, 1054, 1082, 1110, 1138, 1166, 1194, 1222, 1250, 1278, 1306, 1334
      ].map((yVal, idx) => (
        <line
          key={`p1_line_${idx}`}
          x1="105"
          y1={yVal}
          x2="895"
          y2={yVal}
          stroke="#444"
          strokeWidth="1.1"
        />
      ))}

      {/* ----------------- FOOTER ----------------- */}
      <text
        x="500"
        y="1380"
        textAnchor="middle"
        fontSize="14.5"
        fontWeight="400"
        fill="#666"
        letterSpacing="0.5"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        ADAL Sp. z o.o.   •   Koziegłówki, ul. Lipowa 72   •   42-350 Koziegłowy   •   POLAND   •   adal-decorations.pl
      </text>
    </svg>
  );
};

// =========================================================================
// PAGE 2 BACKGROUND (Vector SVG)
// =========================================================================
const AdalPage2Vector: React.FC = () => {
  return (
    <svg
      viewBox="0 0 1000 1414"
      className="w-full h-full pointer-events-none select-none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ backgroundColor: '#ffffff' }}
    >
      {/* ----------------- HEADER ----------------- */}
      {/* Left: GUEST BOOK 2026 */}
      <text
        x="105"
        y="85"
        fontSize="34"
        fontWeight="700"
        letterSpacing="1"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        GUEST BOOK <tspan fontWeight="300">2026</tspan>
      </text>
      <text
        x="105"
        y="114"
        fontSize="17"
        fontWeight="500"
        letterSpacing="1"
        fill="#444"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        MAPIC 3 - 4.11.2026
      </text>

      {/* Right: Adal logo */}
      <g transform="translate(760, 35) scale(0.95)">
        <g fill="#111">
          <path d="M 22 76 L 22 38 C 22 22 36 12 52 12 C 68 12 80 22 80 38 L 80 76 L 65 76 L 65 38 C 65 29 60 23 52 23 C 44 23 37 29 37 38 L 37 76 Z" />
          <rect x="22" y="48" width="58" height="11" rx="1" />
          <path d="M 125 4 Q 125 15 133 15 Q 125 15 125 26 Q 125 15 117 15 Q 125 15 125 4 Z" fill="#111" />
          <rect x="120" y="14" width="10" height="62" rx="1" />
          <circle cx="106" cy="56" r="20" fill="none" stroke="#111" strokeWidth="10" />
          <path d="M 172 40 L 172 76 L 162 76 L 162 70 C 158 75 151 78 143 78 C 132 78 124 71 124 60 C 124 48 134 42 148 42 L 162 42 L 162 40 C 162 34 157 30 149 30 C 142 30 137 33 135 36 L 127 30 C 131 24 140 20 151 20 C 166 20 172 29 172 40 Z M 162 55 L 151 55 C 143 55 138 58 138 63 C 138 67 142 70 148 70 C 156 70 162 65 162 58 Z" />
          <rect x="180" y="14" width="10" height="62" rx="1" />
        </g>
        <text
          x="105"
          y="98"
          textAnchor="middle"
          fontSize="14.5"
          letterSpacing="6"
          fill="#111"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          decorations
        </text>
      </g>

      {/* ----------------- NOTES / PROJECT IDEAS ----------------- */}
      <text
        x="500"
        y="180"
        textAnchor="middle"
        fontSize="24"
        fontWeight="600"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Notes / Project Ideas
      </text>

      {/* 19 Ruled Lines for Notes */}
      {[
        220, 248, 276, 304, 332, 360, 388, 416, 444, 472, 500, 528, 556, 584, 612, 640, 668, 696, 724
      ].map((yVal, idx) => (
        <line
          key={`p2_line_${idx}`}
          x1="105"
          y1={yVal}
          x2="895"
          y2={yVal}
          stroke="#444"
          strokeWidth="1.1"
        />
      ))}

      {/* ----------------- SUMMARY SECTION ----------------- */}
      <text
        x="105"
        y="788"
        fontSize="22"
        fontWeight="700"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Summary
      </text>

      {/* Project Budget */}
      <text x="105" y="828" fontSize="18" fontWeight="600" fill="#111">Project Budget:</text>
      <line x1="240" y1="833" x2="895" y2="833" stroke="#333" strokeWidth="1.2" />

      {/* Deadline */}
      <text x="105" y="888" fontSize="18" fontWeight="600" fill="#111">Deadline:</text>
      <line x1="190" y1="893" x2="895" y2="893" stroke="#333" strokeWidth="1.2" />

      {/* Sales Season */}
      <text x="105" y="942" fontSize="18" fontWeight="600" fill="#111">Sales Season:</text>
      
      {/* Q1, Q2, Q3, Q4 boxes */}
      <rect x="245" y="918" width="42" height="42" fill="none" stroke="#222" strokeWidth="1.5" />
      <text x="266" y="945" textAnchor="middle" fontSize="19" fontWeight="600" fill="#111">Q1</text>

      <rect x="305" y="918" width="42" height="42" fill="none" stroke="#222" strokeWidth="1.5" />
      <text x="326" y="945" textAnchor="middle" fontSize="19" fontWeight="600" fill="#111">Q2</text>

      <rect x="365" y="918" width="42" height="42" fill="none" stroke="#222" strokeWidth="1.5" />
      <text x="386" y="945" textAnchor="middle" fontSize="19" fontWeight="600" fill="#111">Q3</text>

      <rect x="425" y="918" width="42" height="42" fill="none" stroke="#222" strokeWidth="1.5" />
      <text x="446" y="945" textAnchor="middle" fontSize="19" fontWeight="600" fill="#111">Q4</text>

      {/* Project Type */}
      <text x="105" y="995" fontSize="18" fontWeight="600" fill="#111">Project Type:</text>

      {/* Row 1 */}
      {/* [ ] City */}
      <rect x="245" y="981" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="271" y="996" fontSize="16" fill="#333">City</text>

      {/* [ ] Shopping Center */}
      <rect x="342" y="981" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="368" y="996" fontSize="16" fill="#333">Shopping Center</text>

      {/* [ ] Other */}
      <rect x="487" y="981" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="513" y="996" fontSize="16" fill="#333">Other</text>

      {/* Other description rounded box */}
      <rect x="605" y="976" width="290" height="48" rx="14" fill="none" stroke="#777" strokeWidth="1.4" />

      {/* Row 2 */}
      {/* [ ] Event */}
      <rect x="245" y="1018" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="271" y="1033" fontSize="16" fill="#333">Event</text>

      {/* [ ] Hotel / Resort */}
      <rect x="342" y="1018" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="368" y="1033" fontSize="16" fill="#333">Hotel / Resort</text>

      {/* [ ] Retail Chain */}
      <rect x="487" y="1018" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="513" y="1033" fontSize="16" fill="#333">Retail Chain</text>

      {/* ----------------- SURVEY SECTION ----------------- */}
      <text
        x="105"
        y="1080"
        fontSize="22"
        fontWeight="700"
        fill="#111"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        Survey
      </text>

      {/* Instruction text right-aligned */}
      <text x="895" y="1066" textAnchor="end" fontSize="14" fill="#666" fontFamily="system-ui, -apple-system, sans-serif">
        Please select only two boxes, specifying
      </text>
      <text x="895" y="1084" textAnchor="end" fontSize="14" fill="#666" fontFamily="system-ui, -apple-system, sans-serif">
        which is more important to you (1, 2).
      </text>

      {/* Q1 */}
      <text x="105" y="1120" fontSize="16" fontWeight="500" fill="#222">
        What is most important to you as our bussines partner?
      </text>
      {/* Checkboxes: Price, Quality, Production speed, Design, Other */}
      <rect x="110" y="1144" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="134" y="1159" fontSize="15" fill="#333">Price</text>

      <rect x="195" y="1144" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="219" y="1159" fontSize="15" fill="#333">Quality</text>

      <rect x="284" y="1144" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="308" y="1159" fontSize="15" fill="#333">Production speed</text>

      <rect x="435" y="1144" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="459" y="1159" fontSize="15" fill="#333">Design</text>

      <rect x="524" y="1144" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="548" y="1159" fontSize="15" fill="#333">Other</text>

      {/* Rounded box on right */}
      <rect x="605" y="1132" width="290" height="42" rx="12" fill="none" stroke="#777" strokeWidth="1.4" />

      {/* Q2 */}
      <text x="105" y="1195" fontSize="16" fontWeight="500" fill="#222">
        What do you value ADAL for?
      </text>
      <rect x="110" y="1214" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="134" y="1229" fontSize="15" fill="#333">Price</text>

      <rect x="195" y="1214" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="219" y="1229" fontSize="15" fill="#333">Quality</text>

      <rect x="284" y="1214" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="308" y="1229" fontSize="15" fill="#333">Production speed</text>

      <rect x="435" y="1214" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="459" y="1229" fontSize="15" fill="#333">Design</text>

      <rect x="524" y="1214" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="548" y="1229" fontSize="15" fill="#333">Other</text>

      {/* Rounded box on right */}
      <rect x="605" y="1200" width="290" height="42" rx="12" fill="none" stroke="#777" strokeWidth="1.4" />

      {/* Q3 */}
      <text x="105" y="1260" fontSize="16" fontWeight="500" fill="#222">
        What, in your opinion, can we improve?
      </text>
      <rect x="110" y="1279" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="134" y="1294" fontSize="15" fill="#333">Price</text>

      <rect x="195" y="1279" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="219" y="1294" fontSize="15" fill="#333">Quality</text>

      <rect x="284" y="1279" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="308" y="1294" fontSize="15" fill="#333">Production speed</text>

      <rect x="435" y="1279" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="459" y="1294" fontSize="15" fill="#333">Design</text>

      <rect x="524" y="1279" width="18" height="18" fill="none" stroke="#222" strokeWidth="1.4" />
      <text x="548" y="1294" fontSize="15" fill="#333">Other</text>

      {/* Rounded box on right */}
      <rect x="605" y="1266" width="290" height="42" rx="12" fill="none" stroke="#777" strokeWidth="1.4" />

      {/* ----------------- FOOTER ----------------- */}
      <text
        x="500"
        y="1380"
        textAnchor="middle"
        fontSize="14.5"
        fontWeight="400"
        fill="#666"
        letterSpacing="0.5"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        ADAL Sp. z o.o.   •   Koziegłówki, ul. Lipowa 72   •   42-350 Koziegłowy   •   POLAND   •   adal-decorations.pl
      </text>
    </svg>
  );
};
