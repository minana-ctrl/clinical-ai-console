// Extracted verbatim from the Claude Design source, 'Clinical AI Console.dc.html'.
// Bedside OSCE simulator — station 4, fever in an adult.

export const osQuestions = [
  { id: 'duration', q: "How long have you had this fever, and what's it like?", a: 'Three days now. It comes and goes \u2014 worse at night. I shiver until my teeth chatter.', note: 'Opened with duration and character.' },
  { id: 'danger', q: 'Any confusion, fits, or stiffness in your neck?', a: 'No confusion, no fits. My head aches but my neck moves fine.', note: 'Danger signs screened early.' },
  { id: 'travel', q: 'Have you travelled recently, or slept anywhere without a net?', a: 'I went to Ada for a funeral two weeks ago. There was no net there.', note: 'Exposure history taken \u2014 this is what makes malaria likely.' },
  { id: 'assoc', q: 'Any vomiting, or has your urine changed colour?', a: 'I vomited once yesterday. The urine looks normal to me.', note: 'Vomiting matters: it decides oral versus injectable treatment.' },
  { id: 'intake', q: 'Are you eating and drinking normally?', a: 'Not really. I finish half a bowl, and I drink less than usual.', note: 'Oral intake asked \u2014 relevant to hydration and to tolerating tablets.' },
  { id: 'pregnancy', q: 'Is there any chance you could be pregnant?', a: 'No. My last period finished a week ago.', note: 'Pregnancy excluded before prescribing.' },
  { id: 'contacts', q: 'Has anyone at home had the same fever?', a: 'My younger brother had fever last week. He is better now.', note: 'Household contacts noted.' },
  { id: 'meds', q: 'Have you taken anything for it already?', a: 'Some tablets a seller at the lorry station gave me. I do not know what they were.', note: 'Asked what she had already taken \u2014 the unlabelled tablets change your management.' }
];

export const osChartRows = [
  ['Patient', 'Ama Boateng \u00b7 22 \u00b7 female', 0],
  ['Weight', '54 kg', 1],
  ['Allergies', 'No known drug allergy', 0],
  ['History', 'Nil of note. Two uncomplicated malaria episodes in childhood.', 0],
  ['Medication', 'None regular', 0],
  ['Last visit', '14 March 2026 \u2014 sprained ankle', 1],
  ['LMP', '26 July 2026', 1]
];

export const osVitalRows = [
  { label: 'Temp', value: '38.9', unit: '\u00b0C', bad: true },
  { label: 'Pulse', value: '104', unit: '/min', bad: true },
  { label: 'BP', value: '108/68', unit: 'mmHg', bad: false },
  { label: 'RR', value: '20', unit: '/min', bad: false },
  { label: 'SpO\u2082', value: '98', unit: '%', bad: false }
];

export const osTestList = [
  { name: 'Malaria rapid diagnostic test', result: 'Positive \u2014 P. falciparum', bad: true, credit: 12 },
  { name: 'Full blood count', result: 'Hb 10.8 g/dL \u00b7 Plt 96 \u00d710\u2079/L', bad: true, credit: 8 },
  { name: 'Blood glucose', result: '5.2 mmol/L', bad: false, credit: 0 },
  { name: 'Urinalysis', result: 'No nitrites, no leucocytes', bad: false, credit: 0 },
  { name: 'Chest X-ray', result: 'Clear lung fields', bad: false, credit: 0 }
];

export const osDxList = ['Uncomplicated Plasmodium falciparum malaria', 'Severe malaria', 'Typhoid fever', 'Influenza', 'Bacterial meningitis'];

export const osMgmtList = [
  'Artemether\u2013lumefantrine, weight-based, six doses',
  'Paracetamol and oral fluids',
  'Ask what the unlabelled tablets were and stop them',
  'Advise return if vomiting, drowsiness or confusion',
  'Bed net and prevention counselling'
];
