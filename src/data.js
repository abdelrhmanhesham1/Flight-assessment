import { 
  Activity, Pill, BrainCircuit, Wine, Moon, Smile,
  UserCheck, Plane, CloudLightning, Scale,
  Eye, Scale3d, GitPullRequest, ArrowDownCircle, CheckSquare, RefreshCw
} from 'lucide-react';

export const IMSAFE_DATA = [
  {
    id: "illness",
    title: "1. Illness",
    icon: Activity,
    desc: "Evaluate any current health issues that could impair judgment or physical performance.",
    points: [
      "Ask yourself: “Do I have symptoms (fever, congestion, dizziness) that could worsen under flight stress?”",
      "If any illness is noted, rate the likelihood of impairment as high and treat it as a go/no-go decision point."
    ],
    tieIn: "Integrate this row with the PAVE framework under “Pilot”—an unexpected illness shifts your risk matrix immediately.",
    exampleMitigation: "e.g., Minor head cold, symptoms subsiding, cleared by AME. Will monitor sinus pressure on descent."
  },
  {
    id: "medication",
    title: "2. Medication",
    icon: Pill,
    desc: "Many OTC and prescription drugs carry adverse effects not obvious at ground level.",
    points: [
      "List every medication you're taking and check FAA-approved aeromedical guidance or DAIM.",
      "Consider side-effects: drowsiness, blurred vision, nausea. Even “mild” meds can raise your severity rating in the GRM matrix."
    ],
    tieIn: "Use DECIDE’s “Identify” step—spot medication as a hazard, then “Evaluate” its impact on flight tasks. (Note: DECIDE starts with Detect, equivalent to Identify)",
    exampleMitigation: "e.g., Took 200mg ibuprofen for knee pain. No drowsiness experienced. Ground-tested yesterday."
  },
  {
    id: "stress",
    title: "3. Stress",
    icon: BrainCircuit,
    desc: "High stress drains cognitive bandwidth, making you prone to errors and biased judgments.",
    points: [
      "Identify major stressors: work deadlines, family issues, financial concerns.",
      "Rate your stress: low (manageable), medium (occasional distraction), high (constant preoccupation)."
    ],
    tieIn: "During your preflight GRM cost-benefit analysis, factor in stress as a multiplier on other risks—e.g., high stress + marginal weather = unacceptable risk.",
    exampleMitigation: "e.g., Pressed for time on work deadline. Briefing co-pilot to actively challenge my clearances."
  },
  {
    id: "alcohol",
    title: "4. Alcohol",
    icon: Wine,
    desc: "FAA regulations mandate at least eight hours “bottle to throttle,” but residual effects may linger longer.",
    points: [
      "Confirm last drink time and consider residual impairment—even small amounts can reduce situational awareness.",
      "If in doubt, treat alcohol risk as high probability until you’re absolutely certain you’re back to baseline performance."
    ],
    tieIn: "Use this row to enforce personal minimums beyond regulatory minimums, strengthening your go/no-go discipline.",
    exampleMitigation: "e.g., 20 hours since last drink (single beer). Zero residual impairment, fully rested."
  },
  {
    id: "fatigue",
    title: "5. Fatigue",
    icon: Moon,
    desc: "Fatigue undermines every phase of flight—take it as seriously as any mechanical failure.",
    points: [
      "Note hours slept in the past 24 hours, quality of rest, and recent duty periods.",
      "If you’re below your personal rest standard, assign a high severity rating and plan to delay or cancel."
    ],
    tieIn: "In real time, revisit this row at top-of-descent or halfway through your cruise—fresh fatigue checks prevent “just one more leg” syndrome.",
    hasAdvancedFatigue: true,
    exampleMitigation: "e.g., Only got 5 hours sleep. Drank coffee. Short daylight flight, taking extra rest breaks."
  },
  {
    id: "emotions",
    title: "6. Emotions",
    icon: Smile,
    desc: "Emotional volatility (anger, grief, excitement) can hijack rational decision-making.",
    points: [
      "Reflect on recent emotional events: conflicts, celebrations, distractions.",
      "Rate emotional intensity: low (neutral), medium (distracted), high (volatile)."
    ],
    tieIn: "Call out your emotional state aloud in the cockpit and reenter the DECIDE loop—externalizing emotions stabilizes judgment.",
    exampleMitigation: "e.g., Slightly agitated about traffic on the way here. Sitting in cockpit for 3 mins to cool down before engine start."
  }
];

export const PAVE_DATA = [
  {
    id: "pilot",
    title: "Pilot",
    icon: UserCheck,
    desc: "The Pilot element centers on your personal readiness and proficiency. Before every flight, conduct a self-assessment covering health, currency, training, and mindset to ensure you can safely manage the workload and demands of the planned operation.",
    points: [
      "IMSAFE check: Illness, Medication, Stress, Alcohol, Fatigue, Emotion",
      "Review recent training and recent flight experience to confirm currency",
      "Confirm familiarity with aircraft type, avionics, and emergency procedures",
      "Establish personal minimums (e.g., crosswind limits, night takeoff minima)"
    ],
    exampleMitigation: "e.g., Haven't flown glass cockpit in 40 days. Spending 20 mins reviewing avionics manual before taxi."
  },
  {
    id: "aircraft",
    title: "Aircraft",
    icon: Plane,
    desc: "The Aircraft element addresses the condition and performance capabilities of the airplane you intend to fly. Thorough preflight planning and inspection confirm that the aircraft’s airworthiness, equipment, and performance align with your mission profile.",
    points: [
      "Verify airworthiness documents (certificate, registration, maintenance logs)",
      "Perform a detailed preflight inspection (fuel, oil, control surfaces, tires)",
      "Calculate weight & balance and ensure it falls within limits",
      "Reference POH performance charts for takeoff, climb, cruise, and landing"
    ],
    hasAircraftTable: true,
    exampleMitigation: "e.g., Near max gross weight. Calculating precise takeoff roll, adding 15% safety margin."
  },
  {
    id: "environment",
    title: "enVironment",
    icon: CloudLightning,
    desc: "The enVironment element examines all external flight conditions—weather, terrain, airports, airspace—that can affect safety. Use current, reliable sources to anticipate changes along your route and at destination.",
    points: [
      "Obtain a full weather briefing (METARs, TAFs, winds aloft, AIRMETs/SIGMETs)",
      "Check NOTAMs, TFRs, and special use airspace along planned route",
      "Evaluate terrain elevation and obstacle clearance for departure and arrival",
      "Plan alternates and diversion routes in case conditions deteriorate"
    ],
    hasWeatherTable: true,
    exampleMitigation: "e.g., IMC expected at destination. Filed alternate is KXYZ with good VFR forecast, holding extra 45 mins fuel."
  },
  {
    id: "external",
    title: "External Pressures",
    icon: Scale,
    desc: "External Pressures cover the “human factor” influences—passenger expectations, time pressures, business demands, and personal ambitions—that can tempt you into unsafe decisions. Acknowledge and mitigate these before engine start.",
    points: [
      "Identify passenger or organizational expectations (on-time arrival, schedules)",
      "Recognize personal goals (e.g., completing a long cross-country) that may add stress",
      "Build contingency plans and allow margin for delays or unplanned stops",
      "Establish a no-guilt go/no-go decision point and stick to it"
    ],
    exampleMitigation: "e.g., Passengers eager to get home, but storms along route. Briefed them on possible overnight diversion if weather holds."
  }
];

export const DECIDE_DATA = [
  {
    id: "detect",
    title: "1. DETECT",
    icon: Eye,
    desc: "Detect means maintaining continuous, methodical vigilance for anything that can affect your flight. It starts long before you taxi and never stops until you’ve shut down.",
    whatItIs: [
      "A systematic scan of every flight domain: external (weather cells, traffic, terrain), internal (fuel state, systems status, workload), and personal (IMSAFE).",
      "Rapid recognition of change or deviation: unexpected cloud buildup, ATC frequency change, cabin door unlocked light, rising workload."
    ],
    inFlight: [
      "Cross-check instruments and glance outside every 20–30 seconds; note any anomalies.",
      "Use PAVE on the go: mentally tick off each corner of PAVE at level-off and at cruise.",
      "Log emerging hazards on your kneeboard—e.g., 'Turb at FL080', 'MP outage', 'FUEL LOF soon'."
    ],
    exampleMitigation: "e.g., Noticed unexpected cloud buildup ahead. Setting a 5-minute timer to reassess cell growth."
  },
  {
    id: "evaluate",
    title: "2. EVALUATE",
    icon: Scale3d,
    desc: "Once a hazard is detected, quickly assess its severity and probability to gauge how much of a threat it poses to your safety margins.",
    whatItIs: [
      "A two-dimensional risk assessment:",
      "1. Severity (how big an upset or injury could be)",
      "2. Likelihood (how probable is that outcome)",
      "Translate that into a GRM risk score (Negligible, Low, Medium, High, Critical) using the risk matrix."
    ],
    hasRiskCalculator: true,
    inFlight: [
      "Spot moderate chop ahead? Rate it 'medium' if it causes altitude excursions under 100 ft, 'high' if you're straining harness straps.",
      "Evaluate fuel state versus planned diversion (remaining endurance vs. alternate field distance).",
      "Consider time pressure: how long until daylight ends, ETA to weather, or your personal alertness dips."
    ],
    exampleMitigation: "e.g., Moderate chop rated HIGH for passenger comfort. Proceeding to Consider alternatives to smooth the ride."
  },
  {
    id: "consider",
    title: "3. CONSIDER",
    icon: GitPullRequest,
    desc: "With a clear picture of risks, brainstorm all viable courses of action—don’t lock onto the first fix.",
    whatItIs: [
      "Generating at least three workable mitigations or alternatives.",
      "Engaging your crew or passengers: gather any additional input or local knowledge."
    ],
    inFlight: [
      "If a line of thunderstorms crops up, list options: 1. Change altitude 3,000 ft lower 2. Deviate laterally around cells 3. Request vector to an alternate route.",
      "If a minor oil leak appears, consider: returning to departure, landing at closest airport, or continuing with an hour-limit flight plan.",
      "Write your options on a scratchpad to keep them in view."
    ],
    exampleMitigation: "e.g., Options: divert left 20nm, descend 4000ft below freezing level, or return to origin."
  },
  {
    id: "integrate",
    title: "4. INTEGRATE",
    icon: ArrowDownCircle,
    desc: "Merge your chosen mitigations into a coherent flight plan—balance them against performance, regulations, and passenger needs.",
    whatItIs: [
      "Aligning your proposed actions with aircraft limits (weight & balance, climb/descent performance).",
      "Factoring external constraints: airspace, fuel requirements, approach minima.",
      "Sequencing tasks into a logical flow."
    ],
    inFlight: [
      "Diverting around weather? Compute new heading, distance, fuel burn, and ETA.",
      "Integrate ATC clearance: request IFR amendment, amend flight plan in the GPS, file a VFR flight plan if switching.",
      "Update your mental and paper checklist: new altitudes, frequencies, approach brief."
    ],
    exampleMitigation: "e.g., New plan increases fuel burn by 10%; verified reserves still meet legal and personal minimums."
  },
  {
    id: "decide",
    title: "5. DECIDE",
    icon: CheckSquare,
    desc: "Select the single best integrated plan and commit to it—then communicate promptly.",
    whatItIs: [
      "A clear yes/no commitment to one course of action.",
      "Strong verbal call-out: 'I’m diverting to MXY. Heading 180, squawk 1200, time enroute 12 min.'"
    ],
    inFlight: [
      "Once you pick your maneuver, brief your passengers ('We’ll climb to FL100 and shift course 15° right to avoid buildups.').",
      "Tell ATC, transcribe the clearance, set radios and autopilot/modes.",
      "A decision is only good if it’s shared and executed without hesitation."
    ],
    exampleMitigation: "e.g., Decided to descend. Briefed crew: \"We are descending to 3000 to escape icing.\""
  },
  {
    id: "execute",
    title: "6. EXECUTE & REASSESS",
    icon: RefreshCw,
    desc: "Put your decision into action, then monitor outcomes. If conditions change, loop back through Detect–Evaluate and repeat.",
    whatItIs: [
      "Flawless task execution: precise control inputs, checklist discipline, clear call-outs.",
      "Continuous feedback loop: verify your plan’s effect on safety and schedule."
    ],
    inFlight: [
      "After you initiate a descent, check vertical speed vs. Flight Mgmt Computer profile and crosscheck altimeter.",
      "In turbulence, reconfirm seat-belt signs, reinforce secure items, watch oil and engine gauges.",
      "Five minutes after a diversion, run another PAVE scan—if a new hazard emerges, restart DECIDE."
    ],
    exampleMitigation: "e.g., Altitude holding steady in smooth air. Will re-evaluate ETA in 15 minutes."
  }
];
