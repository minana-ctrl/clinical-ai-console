// Extracted verbatim from the Claude Design source, 'Clinical AI Console.dc.html'.
// Appointment ready — personas, conditions and interview scripts.

const A = 'https://huggingface.co/spaces/google/appoint-ready/resolve/main/frontend/public/assets/';

export const scenarioData = [
  { person: 'Jordon Dubois, 35 years old, male', existing: 'Depression', video: A + 'jordan.mp4', poster: A + 'jordan.avif', line: 'Jordon Dubois, 35', initials: 'JD',
    conditions: ['Major depressive disorder (2021)'], meds: ['Sertraline 100 mg daily'], allergy: 'No known drug allergy',
    ehr: 'He is on sertraline. The assistant checks for interactions and for symptoms that overlap with low mood.' },
  { person: 'Alex Sharma, 63 years old, female', existing: 'Diabetes', video: A + 'alex.mp4', poster: A + 'alex.avif', line: 'Alex Sharma, 63', initials: 'AS',
    conditions: ['Type 2 diabetes (2016)', 'Hypertension'], meds: ['Metformin 1 g twice daily', 'Amlodipine 5 mg'], allergy: 'No known drug allergy',
    ehr: 'HbA1c has risen from 7.4% to 9.1% over two years. Fever in a diabetic patient changes the urgency.' },
  { person: 'Sacha Silva, 24 years old, female', existing: 'Asthma', video: A + 'sacha.mp4', poster: A + 'sacha.avif', line: 'Sacha Silva, 24', initials: 'SS',
    conditions: ['Asthma (2011)'], meds: ['Salbutamol inhaler as needed'], allergy: 'Penicillin — rash',
    ehr: 'Her asthma is in the record, so any respiratory symptom is assessed against her baseline.' }
];

export const conditionData = [
  ['Flu', 'A common and contagious respiratory illness caused by a virus that can lead to fever, body aches and fatigue.'],
  ['Malaria', 'A serious disease spread by mosquitoes that causes recurring fevers and chills due to a parasite infecting red blood cells.'],
  ['Migraine', 'A type of severe headache often accompanied by throbbing pain, sensitivity to light and sound, and sometimes nausea.'],
  ['Serotonin syndrome', 'A potentially dangerous reaction caused by too much serotonin in the brain, often due to certain medications, leading to agitation, a rapid heart rate and confusion.']
];

export const caseData = [
  { dx: 'Influenza.',
    script: [
      ['Assistant', 'Tell me what brought you in today, in your own words.'],
      ['Patient', 'I started feeling rough three days ago. Fever, aching all over, and I am exhausted.'],
      ['Assistant', 'Did it come on gradually, or all at once?'],
      ['Patient', 'All at once. I was fine in the morning and shivering by the evening.'],
      ['Assistant', 'Any cough, sore throat or breathlessness with it?'],
      ['Patient', 'A dry cough and a sore throat. Breathing is normal.'],
      ['Assistant', 'Has anyone at home or at work had the same thing?'],
      ['Patient', 'Two people at work were off last week with a fever.']
    ],
    collected: [['Presenting', 'Fever, body aches, fatigue'], ['Onset', '3 days, abrupt'], ['Respiratory', 'Dry cough, sore throat'], ['Breathlessness', 'None'], ['Contacts', 'Two unwell colleagues']],
    report: [
      ['Reason for the visit', 'Interview', 'Three days of abrupt fever, generalised body aches and fatigue, with a dry cough and sore throat. No breathlessness.'],
      ['Course and contacts', 'Interview', 'Symptoms began within hours rather than building over days. Two colleagues were off work with a fever the week before.'],
      ['What the clinician may want to cover', 'Interview + record', 'Fluid intake, whether the fever responds to paracetamol, and whether the existing condition changes the threshold for treating.']
    ],
    flags: ['Abrupt onset with a known unwell contact.', 'Fatigue is limiting normal activity at home.'],
    evals: [
      ['Captured well', 'Onset, the full symptom set and the contact history are all in the report.'],
      ['Partly captured', 'Temperature is described as fever but never measured or quantified.'],
      ['Missed', 'Vaccination status was never asked, and it changes the likelihood.']
    ] },
  { dx: 'Malaria.',
    script: [
      ['Assistant', 'Tell me what brought you in today, in your own words.'],
      ['Patient', 'Fevers that keep coming back. They arrive in the afternoon with chills and then I sweat it out.'],
      ['Assistant', 'How many days has that pattern been going on?'],
      ['Patient', 'Five days now. It comes almost every other day.'],
      ['Assistant', 'Have you travelled recently, or slept anywhere without a net?'],
      ['Patient', 'I was upcountry two weeks ago and there was no net.'],
      ['Assistant', 'Any headache, vomiting or dark urine alongside the fever?'],
      ['Patient', 'Bad headache. No vomiting, and the urine looks normal.']
    ],
    collected: [['Presenting', 'Recurring fever with rigors'], ['Onset', '5 days, cyclical'], ['Exposure', 'Upcountry travel, no net'], ['Warning signs', 'None reported'], ['Associated', 'Severe headache']],
    report: [
      ['Reason for the visit', 'Interview', 'Five days of recurring afternoon fevers with chills and sweats, roughly every other day, with a severe headache.'],
      ['Exposure', 'Interview', 'Travel upcountry two weeks ago, sleeping without a mosquito net.'],
      ['What the clinician may want to cover', 'Interview + record', 'A parasite test before treating, and whether the existing condition affects the choice of antimalarial.']
    ],
    flags: ['Cyclical fever with a clear exposure history.', 'No vomiting or dark urine reported, but neither has been examined.'],
    evals: [
      ['Captured well', 'The fever pattern and the exposure history are recorded precisely.'],
      ['Partly captured', 'Warning signs were asked as a list rather than one at a time.'],
      ['Missed', 'Any antimalarial already taken at home was never asked about.']
    ] },
  { dx: 'Migraine without aura.',
    script: [
      ['Assistant', 'Tell me what brought you in today, in your own words.'],
      ['Patient', 'Headaches. Bad ones, on one side, and light makes them worse.'],
      ['Assistant', 'How long does one episode last, and how often do they come?'],
      ['Patient', 'Most of a day. Two or three times a month for the last six weeks.'],
      ['Assistant', 'Is there any warning before the pain starts — visual changes, numbness?'],
      ['Patient', 'No warning. It just builds.'],
      ['Assistant', 'What do you take for it, and does it help?'],
      ['Patient', 'Paracetamol, most days now. It takes the edge off but never clears it.']
    ],
    collected: [['Presenting', 'Unilateral throbbing headache'], ['Onset', '6 weeks, 2–3 per month'], ['Features', 'Photophobia, nausea'], ['Aura', 'None'], ['Analgesia', 'Paracetamol most days']],
    report: [
      ['Reason for the visit', 'Interview', 'Six weeks of one-sided throbbing headaches lasting most of a day, two to three times a month, with light sensitivity and nausea. No aura.'],
      ['Medication use', 'Interview', 'Paracetamol taken most days with partial relief, which raises the question of medication overuse.'],
      ['What the clinician may want to cover', 'Interview + record', 'Triggers, sleep, and whether anything in the current medication list interacts with a preventer.']
    ],
    flags: ['Analgesia is being taken on most days.', 'Frequency has risen over six weeks.'],
    evals: [
      ['Captured well', 'Duration, frequency, associated features and the absence of aura are all recorded.'],
      ['Partly captured', 'Severity is described but never scored.'],
      ['Missed', 'Neither sleep pattern nor caffeine intake was asked about.']
    ] },
  { dx: 'Serotonin syndrome.',
    script: [
      ['Assistant', 'Tell me what brought you in today, in your own words.'],
      ['Patient', 'I feel wired. Restless, sweating, my heart is racing and I cannot sit still.'],
      ['Assistant', 'When did that start, and has anything about your medication changed recently?'],
      ['Patient', 'Since yesterday. My dose was increased last week.'],
      ['Assistant', 'Have you started anything else — over the counter, herbal, or from another clinic?'],
      ['Patient', 'I bought something for a migraine at the pharmacy a few days ago.'],
      ['Assistant', 'Any shaking, muscle twitching or confusion alongside it?'],
      ['Patient', 'My hands shake and my legs jerk sometimes.']
    ],
    collected: [['Presenting', 'Agitation, sweating, tachycardia'], ['Onset', '24 hours'], ['Medication change', 'Dose increased last week'], ['New agents', 'Pharmacy migraine remedy'], ['Neurological', 'Tremor, myoclonus']],
    report: [
      ['Reason for the visit', 'Interview', 'Twenty-four hours of agitation, sweating, a racing heart and restlessness, with tremor and intermittent leg jerking.'],
      ['Medication timeline', 'Interview + record', 'A dose increase last week, and a pharmacy remedy for migraine started a few days ago on top of the existing prescription.'],
      ['What the clinician may want to cover', 'Interview + record', 'The full list of agents taken in the last week, and observations before anything further is given.']
    ],
    flags: ['Two serotonergic agents may be in use at once.', 'Autonomic and neuromuscular features present together — see this patient before the others.'],
    evals: [
      ['Captured well', 'The medication timeline and the neuromuscular features were both drawn out.'],
      ['Partly captured', 'The pharmacy product is recorded, but not by name.'],
      ['Missed', 'Temperature and rigidity, which decide urgency, were never asked.']
    ] }
];
