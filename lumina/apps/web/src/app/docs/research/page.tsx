import Link from 'next/link';
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Brain,
  Activity,
  Monitor,
  Heart,
  Sun,
  Timer,
  Lightbulb,
  ExternalLink,
  Beaker,
  TrendingUp,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Nav } from '@/components/landing/Nav';
import { Footer } from '@/components/landing/Footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Research | Lumina',
  description:
    'The peer-reviewed science behind Lumina. Explore the research papers on blink detection, eye strain, posture monitoring, and workplace wellness that power our technology.',
};

interface Paper {
  title: string;
  authors: string;
  journal: string;
  year: number;
  summary: string;
  url: string;
  featured?: boolean;
}

interface ResearchCategory {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  accent: string;
  papers: Paper[];
}

const categories: ResearchCategory[] = [
  {
    id: 'ear-blink-detection',
    icon: Eye,
    title: 'Eye Aspect Ratio & Blink Detection',
    accent: 'from-blue-500/20 to-cyan-500/20',
    description:
      'The EAR algorithm is the core of Lumina\'s blink tracking. By measuring the ratio of vertical to horizontal eye landmarks, we detect blinks in real-time with high accuracy and minimal computational cost.',
    papers: [
      {
        title: 'Real-Time Eye Blink Detection using Facial Landmarks',
        authors: 'Soukupova, T. & Cech, J.',
        journal: '21st Computer Vision Winter Workshop (CVWW)',
        year: 2016,
        summary:
          'The seminal paper introducing the Eye Aspect Ratio (EAR) metric for blink detection. Lumina uses this exact algorithm to track blinks using six landmarks per eye.',
        url: 'https://vision.fe.uni-lj.si/cvww2016/proceedings/papers/05.pdf',
        featured: true,
      },
      {
        title: 'Effect of Visual Display Unit Use on Blink Rate and Tear Stability',
        authors: 'Tsubota, K. & Nakamori, K.',
        journal: 'British Journal of Ophthalmology',
        year: 1993,
        summary:
          'Early foundational work establishing that blink rate decreases significantly during VDU use, leading to tear film instability and dry eye symptoms.',
        url: 'https://www.researchgate.net/publication/21388443_Effect_of_Visual_Display_Unit_Use_on_Blink_Rate_and_Tear_Stability',
      },
      {
        title: 'Blink Patterns: Reading from a Computer Screen versus Hard Copy',
        authors: 'Chu, C.A., Rosenfield, M. & Portello, J.K.',
        journal: 'Optometry and Vision Science',
        year: 2014,
        summary:
          'Demonstrates that a significantly higher percentage of incomplete blinks occurs during computer reading versus print, a key insight behind Lumina\'s complete-vs-partial blink classification.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/24413278/',
      },
    ],
  },
  {
    id: 'computer-vision-syndrome',
    icon: Monitor,
    title: 'Computer Vision Syndrome & Digital Eye Strain',
    accent: 'from-violet-500/20 to-purple-500/20',
    description:
      'Computer Vision Syndrome (CVS) affects an estimated 66% of knowledge workers. Understanding its prevalence and mechanisms is foundational to Lumina\'s approach to proactive wellness.',
    papers: [
      {
        title: 'Prevalence of Computer Vision Syndrome: A Systematic Review and Meta-Analysis',
        authors: 'Ccami-Bernal, F. et al.',
        journal: 'Journal of Optometry',
        year: 2024,
        summary:
          'Comprehensive meta-analysis estimating CVS prevalence at 66% among computer users, validating the scale of the problem Lumina addresses.',
        url: 'https://www.sciencedirect.com/science/article/pii/S1888429623000304',
        featured: true,
      },
      {
        title: 'Computer Vision Syndrome and Its Determinants: A Systematic Review and Meta-Analysis',
        authors: 'Al Tawil, L. et al.',
        journal: 'BMJ Open Ophthalmology',
        year: 2022,
        summary:
          'Identifies key risk factors for CVS including screen time duration, viewing distance, and break frequency -- all metrics that Lumina actively monitors.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9743027/',
      },
      {
        title: 'Computer Vision Syndrome: A Comprehensive Literature Review',
        authors: 'Mohan, A. et al.',
        journal: 'Journal of Optometry',
        year: 2025,
        summary:
          'The most recent comprehensive review covering CVS research from 2014-2024, confirming that digital eye strain remains a growing workplace health concern.',
        url: 'https://www.tandfonline.com/doi/full/10.1080/20565623.2025.2476923',
      },
    ],
  },
  {
    id: 'blink-rate-screen',
    icon: Activity,
    title: 'Blink Rate & Screen Use',
    accent: 'from-emerald-500/20 to-teal-500/20',
    description:
      'Research consistently shows that concentrated screen work suppresses blink rate, sometimes by over 60%. Lumina monitors your personal baseline and alerts you when your rate drops below your norm.',
    papers: [
      {
        title: 'Cognitive Demand, Digital Screens and Blink Rate',
        authors: 'Rosenfield, M. et al.',
        journal: 'Computers in Human Behavior',
        year: 2015,
        summary:
          'Reveals that cognitive demand has a larger effect on blink rate than screen type alone, informing Lumina\'s context-aware monitoring approach.',
        url: 'https://www.sciencedirect.com/science/article/abs/pii/S0747563215003829',
      },
      {
        title: 'The Relationship Between Dry Eye Disease and Digital Screen Use',
        authors: 'Coles-Brennan, C., Sulley, A. & Young, G.',
        journal: 'Clinical and Experimental Optometry',
        year: 2021,
        summary:
          'Establishes the causal pathway from reduced blink frequency during screen use to dry eye disease, the mechanism Lumina aims to interrupt.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8439964/',
      },
      {
        title: 'Blinking Kinematics Characterization During Digital Display Use',
        authors: 'Argiles, M. et al.',
        journal: 'Graefe\'s Archive for Clinical and Experimental Ophthalmology',
        year: 2022,
        summary:
          'Characterizes blink kinematics (speed, completeness, interval) during digital display use, providing the science behind Lumina\'s blink quality analysis.',
        url: 'https://link.springer.com/article/10.1007/s00417-021-05490-9',
      },
    ],
  },
  {
    id: '20-20-20-rule',
    icon: Timer,
    title: '20-20-20 Rule & Break Strategies',
    accent: 'from-amber-500/20 to-orange-500/20',
    description:
      'The popular 20-20-20 rule has mixed clinical evidence. Lumina uses adaptive break timing based on your actual eye strain indicators rather than rigid intervals.',
    papers: [
      {
        title: 'The Effects of Breaks on Digital Eye Strain, Dry Eye and Binocular Vision: Testing the 20-20-20 Rule',
        authors: 'Talens-Estarelles, C. et al.',
        journal: 'Contact Lens and Anterior Eye',
        year: 2023,
        summary:
          'Prospective clinical study showing that 20-20-20 rule reminders significantly decreased digital eye strain scores in symptomatic volunteers.',
        url: 'https://www.sciencedirect.com/science/article/pii/S1367048422001990',
        featured: true,
      },
      {
        title: '20-20-20 Rule: Are These Numbers Justified?',
        authors: 'Rosenfield, M. & Li, R.T.',
        journal: 'Optometry and Vision Science',
        year: 2022,
        summary:
          'Critical evaluation finding that while break strategies help, the specific 20-20-20 numbers lack strong justification. Supports Lumina\'s adaptive approach over rigid timing.',
        url: 'https://pubmed.ncbi.nlm.nih.gov/36473088/',
      },
      {
        title: 'Efficacy of Blink Software in Improving Blink Rate and Dry Eye Symptoms in VDT Users',
        authors: 'Kim, A.D. et al.',
        journal: 'Indian Journal of Ophthalmology',
        year: 2021,
        summary:
          'Randomized controlled trial demonstrating that software-based blink reminders significantly improve blink rate, validating Lumina\'s reminder-based intervention model.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC8597488/',
      },
    ],
  },
  {
    id: 'perclos-fatigue',
    icon: Brain,
    title: 'PERCLOS & Fatigue Detection',
    accent: 'from-rose-500/20 to-pink-500/20',
    description:
      'PERCLOS (Percentage of Eye Closure) is a NHTSA-validated drowsiness metric. Lumina adapts this automotive safety technology for workplace fatigue detection.',
    papers: [
      {
        title: 'PERCLOS-Based Technologies for Detecting Drowsiness: Current Evidence and Future Directions',
        authors: 'Abe, T. et al.',
        journal: 'SLEEP Advances (Oxford Academic)',
        year: 2023,
        summary:
          'Comprehensive review establishing PERCLOS as one of the most validated indices for passive drowsiness detection, the basis of Lumina\'s fatigue scoring.',
        url: 'https://academic.oup.com/sleepadvances/article/4/1/zpad006/7000589',
        featured: true,
      },
      {
        title: 'Drowsiness Detection System Based on PERCLOS and Facial Physiological Signal',
        authors: 'You, F. et al.',
        journal: 'Sensors',
        year: 2022,
        summary:
          'Combines PERCLOS with facial physiological signals for improved drowsiness detection accuracy, a multi-signal approach that informs Lumina\'s fatigue algorithm.',
        url: 'https://www.mdpi.com/1424-8220/22/14/5380',
      },
    ],
  },
  {
    id: 'posture-head-pose',
    icon: Activity,
    title: 'Posture Monitoring via Facial Landmarks',
    accent: 'from-sky-500/20 to-indigo-500/20',
    description:
      'Lumina estimates head pose and screen distance from facial landmarks alone -- no body camera needed. This enables ergonomic nudges without additional hardware.',
    papers: [
      {
        title: 'Ergonomic Risk Assessment Using Human Pose Estimation with MediaPipe Pose',
        authors: 'Various Authors',
        journal: 'ACM Conference on AI and Cloud Computing',
        year: 2024,
        summary:
          'Demonstrates that MediaPipe-based pose estimation can reliably assess ergonomic risk, validating Lumina\'s approach to posture monitoring without specialized hardware.',
        url: 'https://dl.acm.org/doi/10.1145/3719384.3719453',
      },
      {
        title: 'Recognition of Forward Head Posture Through 3D Human Pose Estimation with a Graph Convolutional Network',
        authors: 'Kim, S. et al.',
        journal: 'JMIR Formative Research',
        year: 2024,
        summary:
          'Shows that forward head posture causes headaches, impaired respiratory function, and fatigue. Validates the health impact of the posture issues Lumina detects.',
        url: 'https://formative.jmir.org/2024/1/e55476',
      },
      {
        title: 'Deep Learning and Machine Learning Techniques for Head Pose Estimation: A Survey',
        authors: 'Khan, M.Z. et al.',
        journal: 'Artificial Intelligence Review (Springer)',
        year: 2024,
        summary:
          'Comprehensive survey of head pose estimation techniques using facial landmarks, covering the geometric and deep learning methods that underpin Lumina\'s posture tracking.',
        url: 'https://link.springer.com/article/10.1007/s10462-024-10936-7',
      },
    ],
  },
  {
    id: 'mediapipe',
    icon: Beaker,
    title: 'MediaPipe Face Mesh',
    accent: 'from-lime-500/20 to-green-500/20',
    description:
      'Lumina is built on Google\'s MediaPipe Face Mesh, which provides 468 3D facial landmarks in real-time on consumer hardware. This enables all of our monitoring without cloud processing.',
    papers: [
      {
        title: 'Real-time Facial Surface Geometry from Monocular Video on Mobile GPUs',
        authors: 'Kartynnik, Y., Ablavatski, A., Grishchenko, I. & Grundmann, M.',
        journal: 'arXiv preprint (Google Research)',
        year: 2019,
        summary:
          'The foundational paper behind MediaPipe Face Mesh. Describes the neural network that infers 468 3D landmarks in real-time, the core technology enabling Lumina\'s local processing.',
        url: 'https://arxiv.org/abs/1907.06724',
        featured: true,
      },
    ],
  },
  {
    id: 'workplace-wellness-roi',
    icon: TrendingUp,
    title: 'Workplace Wellness ROI',
    accent: 'from-emerald-500/20 to-cyan-500/20',
    description:
      'Enterprise customers need data on returns. Research shows wellness programs yield $3-6 in savings for every $1 invested through reduced absenteeism and healthcare costs.',
    papers: [
      {
        title: 'Workplace Wellness Programs Can Generate Savings',
        authors: 'Baicker, K., Cutler, D. & Song, Z.',
        journal: 'Health Affairs',
        year: 2010,
        summary:
          'Harvard meta-analysis finding medical costs fall $3.27 and absenteeism costs fall $2.73 for every $1 spent on wellness programs -- a combined 6:1 ROI.',
        url: 'https://www.healthaffairs.org/doi/10.1377/hlthaff.2009.0626',
        featured: true,
      },
      {
        title: '"Give Me a Break!" A Systematic Review and Meta-Analysis on the Efficacy of Micro-Breaks',
        authors: 'Albulescu, P. et al.',
        journal: 'PLOS ONE',
        year: 2022,
        summary:
          'Meta-analysis showing that micro-breaks significantly improve well-being and reduce fatigue without decreasing productivity, supporting Lumina\'s break reminder approach.',
        url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460',
      },
      {
        title: 'Effects of Active Microbreaks on the Physical and Mental Well-Being of Office Workers',
        authors: 'Gimenez-Nadal, J.I. et al.',
        journal: 'Cogent Engineering',
        year: 2022,
        summary:
          'Systematic review confirming that two active micro-breaks per hour improve physical and mental function without harming productivity.',
        url: 'https://www.tandfonline.com/doi/full/10.1080/23311916.2022.2026206',
      },
    ],
  },
  {
    id: 'blue-light-circadian',
    icon: Sun,
    title: 'Blue Light & Circadian Rhythm',
    accent: 'from-amber-500/20 to-yellow-500/20',
    description:
      'Evening screen exposure suppresses melatonin and disrupts sleep. Lumina tracks cumulative screen time and can recommend wind-down periods to protect your circadian rhythm.',
    papers: [
      {
        title: 'Blue Light from Light-Emitting Diodes Elicits a Dose-Dependent Suppression of Melatonin in Humans',
        authors: 'West, K.E. et al.',
        journal: 'Journal of Applied Physiology',
        year: 2011,
        summary:
          'Establishes that blue LED light (446-477 nm) suppresses melatonin in a dose-dependent manner, the physiological basis for Lumina\'s evening screen time awareness features.',
        url: 'https://journals.physiology.org/doi/full/10.1152/japplphysiol.01413.2009',
      },
      {
        title: 'Systematic Review of Light Exposure Impact on Human Circadian Rhythm',
        authors: 'Wahl, S. et al.',
        journal: 'Chronobiology International',
        year: 2019,
        summary:
          'Confirms that two hours of evening blue light exposure suppresses melatonin and delays sleep onset, supporting time-aware wellness recommendations.',
        url: 'https://www.tandfonline.com/doi/full/10.1080/07420528.2018.1527773',
      },
    ],
  },
  {
    id: 'break-productivity',
    icon: Heart,
    title: 'Break Frequency & Productivity',
    accent: 'from-fuchsia-500/20 to-pink-500/20',
    description:
      'Counter-intuitively, more frequent breaks improve productivity. Lumina helps teams take better breaks at the right times, boosting both wellness and output.',
    papers: [
      {
        title: 'Prevalence of Computer Vision Syndrome During the COVID-19 Pandemic',
        authors: 'Leon-Figueroa, D.A. et al.',
        journal: 'BMC Public Health',
        year: 2024,
        summary:
          'Shows CVS prevalence increased 74% during the pandemic remote work shift, underscoring the need for tools like Lumina in distributed work environments.',
        url: 'https://bmcpublichealth.biomedcentral.com/articles/10.1186/s12889-024-17636-5',
      },
      {
        title: 'The 20/20/20 Rule: Practicing Pattern and Associations with Asthenopic Symptoms',
        authors: 'Alghamdi, W. & Alrasheed, S.H.',
        journal: 'Journal of Optometry',
        year: 2023,
        summary:
          'Studies real-world adoption of the 20-20-20 rule and finds low compliance rates, highlighting the need for automated tools like Lumina over manual rules.',
        url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10391416/',
      },
    ],
  },
];

const totalPapers = categories.reduce((sum, cat) => sum + cat.papers.length, 0);

/* ---------- decorative SVG components ---------- */

function NetworkGraph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 400 300" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* connection lines */}
      <line x1="80" y1="60" x2="200" y2="120" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <line x1="200" y1="120" x2="320" y2="80" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <line x1="200" y1="120" x2="160" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <line x1="200" y1="120" x2="300" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <line x1="160" y1="220" x2="300" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.12" />
      <line x1="80" y1="60" x2="60" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <line x1="60" y1="180" x2="160" y2="220" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <line x1="320" y1="80" x2="340" y2="180" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <line x1="340" y1="180" x2="300" y2="200" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      {/* nodes */}
      <circle cx="80" cy="60" r="6" fill="currentColor" opacity="0.2" />
      <circle cx="200" cy="120" r="10" fill="currentColor" opacity="0.25" />
      <circle cx="320" cy="80" r="5" fill="currentColor" opacity="0.18" />
      <circle cx="160" cy="220" r="7" fill="currentColor" opacity="0.2" />
      <circle cx="300" cy="200" r="5" fill="currentColor" opacity="0.15" />
      <circle cx="60" cy="180" r="4" fill="currentColor" opacity="0.12" />
      <circle cx="340" cy="180" r="4" fill="currentColor" opacity="0.12" />
      {/* center pulse rings */}
      <circle cx="200" cy="120" r="20" stroke="currentColor" strokeWidth="1" opacity="0.1" />
      <circle cx="200" cy="120" r="35" stroke="currentColor" strokeWidth="0.5" opacity="0.06" />
    </svg>
  );
}

function EyeIllustration({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="60" cy="40" rx="50" ry="30" stroke="currentColor" strokeWidth="1.5" opacity="0.2" />
      <ellipse cx="60" cy="40" rx="35" ry="20" stroke="currentColor" strokeWidth="1" opacity="0.15" />
      <circle cx="60" cy="40" r="12" fill="currentColor" opacity="0.15" />
      <circle cx="60" cy="40" r="5" fill="currentColor" opacity="0.25" />
      <circle cx="56" cy="36" r="2" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function BrainWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M0 30 Q25 10 50 30 Q75 50 100 30 Q125 10 150 30 Q175 50 200 30" stroke="currentColor" strokeWidth="1.5" opacity="0.15" fill="none" />
      <path d="M0 30 Q25 20 50 30 Q75 40 100 30 Q125 20 150 30 Q175 40 200 30" stroke="currentColor" strokeWidth="1" opacity="0.1" fill="none" />
    </svg>
  );
}

/* ---------- key stat callouts shown between sections ---------- */

const keyStats = [
  { value: '66%', label: 'of workers experience Computer Vision Syndrome', afterSection: 1 },
  { value: '60%', label: 'reduction in blink rate during concentrated screen work', afterSection: 2 },
  { value: '6:1', label: 'ROI on workplace wellness programs (Harvard)', afterSection: 6 },
];

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        {/* ===================== HERO ===================== */}
        <section className="relative overflow-hidden">
          <div className="container max-w-6xl">
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 mb-8 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to docs
            </Link>

            <div className="grid lg:grid-cols-2 gap-12 items-center mb-20">
              {/* Left: text */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-6">
                  <BookOpen className="w-4 h-4" />
                  Peer-Reviewed Research
                </div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5">
                  The Science Behind{' '}
                  <span className="text-primary">Lumina</span>
                </h1>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Every algorithm, threshold, and intervention in Lumina traces back to
                  peer-reviewed evidence. We build on decades of research in ophthalmology,
                  computer vision, ergonomics, and occupational health.
                </p>

                {/* Stats row */}
                <div className="mt-8 flex gap-8">
                  <div>
                    <p className="text-3xl font-bold text-primary">{totalPapers}</p>
                    <p className="text-sm text-muted-foreground">Papers</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div>
                    <p className="text-3xl font-bold text-primary">{categories.length}</p>
                    <p className="text-sm text-muted-foreground">Research Areas</p>
                  </div>
                  <div className="w-px bg-border" />
                  <div>
                    <p className="text-3xl font-bold text-primary">1993-2025</p>
                    <p className="text-sm text-muted-foreground">Span</p>
                  </div>
                </div>
              </div>

              {/* Right: illustration */}
              <div className="relative hidden lg:flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-3xl" />
                <NetworkGraph className="w-full h-72 text-primary relative z-10" />
                {/* floating accent circles */}
                <div className="absolute top-8 right-8 w-20 h-20 bg-primary/5 rounded-full blur-xl" />
                <div className="absolute bottom-12 left-12 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* ===================== CATEGORY NAV ===================== */}
        <section className="border-y border-border bg-muted/30 sticky top-16 z-30 backdrop-blur-sm">
          <div className="container max-w-6xl py-3">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {categories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all whitespace-nowrap flex-shrink-0"
                >
                  {cat.title}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== RESEARCH SECTIONS ===================== */}
        <div className="container max-w-6xl pt-16">
          <div className="space-y-12">
            {categories.map((category, catIndex) => {
              const stat = keyStats.find((s) => s.afterSection === catIndex);
              const isReversed = catIndex % 2 === 1;

              const infoPanel = (
                <div className={`relative rounded-2xl bg-gradient-to-br ${category.accent} p-8 overflow-hidden h-full flex flex-col`}>
                  <div className="relative z-10 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-background/80 backdrop-blur flex items-center justify-center mb-5">
                      <category.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold mb-3">{category.title}</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      {category.description}
                    </p>
                    <div className="mt-6 pt-5 border-t border-foreground/5">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground/60 mb-1">Papers in this area</p>
                      <p className="text-3xl font-bold text-primary">{category.papers.length}</p>
                    </div>
                  </div>
                  {/* Decorative SVG */}
                  {catIndex === 0 && <EyeIllustration className="absolute right-4 bottom-4 w-32 h-24 text-primary opacity-30" />}
                  {catIndex === 4 && <BrainWave className="absolute right-2 bottom-6 w-44 h-14 text-primary opacity-40" />}
                  {catIndex !== 0 && catIndex !== 4 && (
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                  )}
                </div>
              );

              const papersPanel = (
                <div className="grid gap-3">
                  {category.papers.map((paper) => (
                    <a
                      key={paper.title}
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group block p-5 rounded-xl border transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                        paper.featured
                          ? 'border-primary/30 bg-primary/[0.02] hover:border-primary/50'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            {paper.featured && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                <Sparkles className="w-3 h-3" />
                                Key Paper
                              </span>
                            )}
                            <span className="text-xs text-muted-foreground font-mono">{paper.year}</span>
                          </div>
                          <h3 className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors mb-1">
                            {paper.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {paper.authors} &middot;{' '}
                            <span className="italic">{paper.journal}</span>
                          </p>
                        </div>
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg border border-border group-hover:border-primary/30 group-hover:bg-primary/5 flex items-center justify-center transition-all">
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              );

              return (
                <div key={category.id}>
                  <section id={category.id} className="scroll-mt-32">
                    <div className={`grid lg:grid-cols-5 gap-5 ${isReversed ? '' : ''}`}>
                      {isReversed ? (
                        <>
                          <div className="lg:col-span-3">{papersPanel}</div>
                          <div className="lg:col-span-2">{infoPanel}</div>
                        </>
                      ) : (
                        <>
                          <div className="lg:col-span-2">{infoPanel}</div>
                          <div className="lg:col-span-3">{papersPanel}</div>
                        </>
                      )}
                    </div>
                  </section>

                  {/* Stat callout between sections */}
                  {stat && (
                    <div className="my-12 flex items-center gap-6 px-8 py-6 rounded-2xl bg-muted/50 border border-border">
                      <p className="text-5xl font-bold text-primary flex-shrink-0">{stat.value}</p>
                      <div className="w-px h-12 bg-border flex-shrink-0" />
                      <p className="text-muted-foreground text-lg">{stat.label}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ===================== HOW WE USE THIS ===================== */}
          <section className="mt-20 relative overflow-hidden rounded-2xl border border-primary/20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background" />
            <div className="relative z-10 p-8 md:p-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Lightbulb className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold">How We Apply This Research</h3>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {[
                  {
                    title: 'EAR Thresholds',
                    text: 'Calibrated per user following Soukupova & Cech\'s methodology, with personalized baselines established during onboarding.',
                    icon: Eye,
                  },
                  {
                    title: 'Adaptive Break Timing',
                    text: 'Adapts to your actual strain indicators rather than rigid 20-minute intervals, informed by meta-analyses on break efficacy.',
                    icon: Timer,
                  },
                  {
                    title: 'Fatigue Detection',
                    text: 'Combines PERCLOS scoring with blink pattern analysis, drawing from automotive safety research and ophthalmology.',
                    icon: Brain,
                  },
                  {
                    title: 'Local Processing',
                    text: 'All analysis runs on-device thanks to MediaPipe Face Mesh at 100+ FPS, ensuring complete privacy.',
                    icon: Beaker,
                  },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-background/60 backdrop-blur border border-border/50">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{item.title}</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ===================== CTA ===================== */}
          <section className="mt-12 grid md:grid-cols-2 gap-4">
            <Link
              href="/blog"
              className="group p-8 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <BookOpen className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                Read the Blog
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Accessible deep-dives into the science behind every Lumina feature.
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                Explore articles <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
            <Link
              href="/download"
              className="group p-8 rounded-2xl border border-border hover:border-primary/30 hover:shadow-lg transition-all"
            >
              <Sparkles className="w-8 h-8 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">
                Try Lumina Free
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Experience evidence-based eye wellness. Download for Windows or macOS.
              </p>
              <span className="inline-flex items-center gap-1 text-sm text-primary font-medium">
                Download now <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
