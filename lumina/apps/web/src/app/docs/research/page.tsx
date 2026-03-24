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
}

interface ResearchCategory {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  papers: Paper[];
}

const categories: ResearchCategory[] = [
  {
    id: 'ear-blink-detection',
    icon: Eye,
    title: 'Eye Aspect Ratio & Blink Detection',
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
        authors: 'Argilés, M. et al.',
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
      },
    ],
  },
  {
    id: 'workplace-wellness-roi',
    icon: TrendingUp,
    title: 'Workplace Wellness ROI',
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
      },
      {
        title: '"Give Me a Break!" A Systematic Review and Meta-Analysis on the Efficacy of Micro-Breaks',
        authors: 'Albulescu, P. et al.',
        journal: 'PLOS ONE',
        year: 2022,
        summary:
          'Meta-analysis showing that micro-breaks (1-10 minutes) significantly improve well-being and reduce fatigue without decreasing productivity, supporting Lumina\'s break reminder approach.',
        url: 'https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0272460',
      },
      {
        title: 'Effects of Active Microbreaks on the Physical and Mental Well-Being of Office Workers: A Systematic Review',
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
    description:
      'Counter-intuitively, more frequent breaks improve productivity. Lumina helps teams take better breaks at the right times, boosting both wellness and output.',
    papers: [
      {
        title: 'Prevalence of Computer Vision Syndrome During the COVID-19 Pandemic: A Systematic Review and Meta-Analysis',
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

export default function ResearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main className="pt-24 pb-16">
        <div className="container max-w-5xl">
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 mb-6 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to docs
          </Link>

          {/* Hero */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm mb-4">
              <BookOpen className="w-4 h-4" />
              Research
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              The Science Behind Lumina
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Every feature in Lumina is grounded in peer-reviewed research. We build on decades of
              work in ophthalmology, computer vision, ergonomics, and occupational health to create
              technology that genuinely protects your wellbeing.
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-4 mb-16">
            <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-2xl font-bold text-primary">{totalPapers}</p>
              <p className="text-sm text-muted-foreground">Papers Referenced</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-2xl font-bold text-primary">{categories.length}</p>
              <p className="text-sm text-muted-foreground">Research Areas</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
              <p className="text-2xl font-bold text-primary">1993-2025</p>
              <p className="text-sm text-muted-foreground">Publication Range</p>
            </div>
          </div>

          {/* Category nav */}
          <div className="mb-16 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="px-3 py-1.5 rounded-lg text-sm border border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-foreground transition-all"
              >
                {cat.title}
              </a>
            ))}
          </div>

          {/* Research categories */}
          <div className="space-y-20">
            {categories.map((category) => (
              <section key={category.id} id={category.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <category.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold">{category.title}</h2>
                </div>
                <p className="text-muted-foreground mb-6 max-w-3xl">
                  {category.description}
                </p>
                <div className="grid gap-4">
                  {category.papers.map((paper) => (
                    <div
                      key={paper.title}
                      className="p-6 rounded-xl border border-border hover:shadow-lg hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold mb-1 leading-snug">
                            {paper.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {paper.authors} &middot; <span className="italic">{paper.journal}</span>{' '}
                            &middot; {paper.year}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {paper.summary}
                          </p>
                        </div>
                        <a
                          href={paper.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-primary border border-primary/20 hover:bg-primary/5 transition-colors flex-shrink-0 mt-1"
                        >
                          View Paper
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* How We Use This Research callout */}
          <section className="mt-20 p-8 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3">How We Use This Research</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    Lumina is not a research project -- it is a practical application of proven
                    science. Every algorithm, threshold, and intervention in our product traces back
                    to peer-reviewed evidence.
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-foreground">EAR thresholds</strong> are calibrated per user
                        following Soukupova &amp; Cech&apos;s methodology, with personalized baselines
                        established during onboarding.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-foreground">Break timing</strong> adapts to your actual
                        strain indicators rather than rigid 20-minute intervals, informed by meta-analyses
                        showing that consistency matters more than exact timing.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-foreground">Fatigue detection</strong> combines PERCLOS
                        scoring with blink pattern analysis, drawing from both automotive safety research
                        and ophthalmology.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span>
                        <strong className="text-foreground">All processing is local</strong> thanks to
                        MediaPipe Face Mesh running at 100+ FPS on consumer hardware, ensuring privacy
                        while maintaining real-time responsiveness.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="mt-12 p-8 rounded-xl bg-muted/50 border border-border text-center">
            <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Want to learn more?</h3>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Read our blog for accessible deep-dives into the science, or download Lumina to
              experience evidence-based wellness firsthand.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/blog" className="btn btn-primary">
                Read the Blog
              </Link>
              <Link href="/download" className="btn btn-secondary">
                Download Lumina
              </Link>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
