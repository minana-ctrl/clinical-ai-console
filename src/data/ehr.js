// Extracted verbatim from the Claude Design source, 'Clinical AI Console.dc.html'.
// EHR navigator agent — FHIR retrieval traces.

export const ehrCases = [
  { id: 'q1',
    question: "What were the results and dates of the patient's lastest lipid panel and CBC tests?",
    patient: 'c1ae6e14-1833-a8e2-8e26-e0508236994a',
    manifest: '{"Observation": 412, "DiagnosticReport": 38, "Encounter": 64, "Condition": 21, "Procedure": 29, "MedicationRequest": 17, "Immunization": 14}',
    resources: [
      { type: 'DiagnosticReport',
        codes: '["24331-1 Lipid 1996 panel", "58410-2 CBC panel - Blood by Automated count"]',
        facts: '...Lipid 1996 panel, effective 2024-03-14, status final. CBC panel - Blood by Automated count, effective 2024-03-14, status final.' },
      { type: 'Observation',
        codes: '["2093-3 Cholesterol", "18262-6 LDL-c", "2085-9 HDL-c", "2571-8 Triglycerides", "6690-2 Leukocytes", "789-8 Erythrocytes", "718-7 Hemoglobin", "4544-3 Hematocrit", "777-3 Platelets"]',
        facts: '...Cholesterol 178 mg/dL; LDL 98 mg/dL; HDL 52 mg/dL; Triglycerides 141 mg/dL; Leukocytes 6.4 10*3/uL; Hemoglobin 14.2 g/dL; Platelets 258 10*3/uL' }
    ],
    intro: 'Both panels were drawn on the same day, 14 March 2024.',
    sections: [
      { title: 'Lipid panel, 14 March 2024', items: ['Total cholesterol 178 mg/dL', 'LDL cholesterol 98 mg/dL', 'HDL cholesterol 52 mg/dL', 'Triglycerides 141 mg/dL'] },
      { title: 'Complete blood count, 14 March 2024', items: ['Leukocytes 6.4 10*3/uL', 'Erythrocytes 4.7 10*6/uL', 'Haemoglobin 14.2 g/dL', 'Haematocrit 41.8 %', 'Platelets 258 10*3/uL'] }
    ] },
  { id: 'q2',
    question: 'What specific medications were administered to the patient during their sepsis encounter?',
    patient: 'e4350e97-bb8c-70b7-9997-9e098cfacef8',
    manifest: '{"Encounter": 87, "Condition": 34, "MedicationAdministration": 96, "MedicationRequest": 41, "Observation": 528, "Procedure": 52}',
    resources: [
      { type: 'Encounter',
        codes: '["91302008 Sepsis (disorder)", "1505002 Hospital admission for observation"]',
        facts: '...Inpatient encounter for sepsis, 2021-06-02 to 2021-06-06, Springfield General Hospital, class IMP.' },
      { type: 'MedicationAdministration',
        codes: '["1807510 Vancomycin", "1659149 Piperacillin/Tazobactam", "313002 Sodium chloride 0.9%", "242969 Norepinephrine"]',
        facts: '...Vancomycin 1000 mg IV, 2021-06-02; Piperacillin/tazobactam 4 g/0.5 g IV, 2021-06-02; Sodium chloride 0.9% 1000 mL IV bolus; Norepinephrine 4 mg/250 mL infusion, 2021-06-03' }
    ],
    intro: 'The sepsis encounter ran from 2 to 6 June 2021. Four medications were administered during it.',
    sections: [
      { title: 'Administered during the encounter', items: ['Vancomycin 1000 mg, intravenous', 'Piperacillin / tazobactam 4 g / 0.5 g, intravenous', 'Sodium chloride 0.9% 1000 mL, intravenous bolus', 'Norepinephrine 4 mg in 250 mL, intravenous infusion'] }
    ] }
];

export function ehrEventsFor(c) {
  const ev = [];
  ev.push({ d: 'req', dest: 'LLM', e: 'Define manifest tool to LLM' });
  ev.push({ d: 'res', dest: 'LLM', e: 'Tool call generated', data: 'get_patient_fhir_manifest(patient_id="' + c.patient + '")' });
  ev.push({ d: 'req', dest: 'FHIR', e: 'Get patient resources' });
  ev.push({ d: 'res', dest: 'FHIR', e: 'Patient resources received. Agent creating manifest.', data: c.manifest });
  ev.push({ d: 'req', dest: 'LLM', e: 'Identify relevant FHIR resources' });
  ev.push({ d: 'res', dest: 'LLM', e: 'Selected FHIR resources to use', data: '[' + c.resources.map((r) => '"' + r.type + '"').join(', ') + ']' });
  c.resources.forEach((r) => {
    ev.push({ d: 'req', dest: 'LLM', e: 'Select data for ' + r.type + ' resource', data: r.codes });
    ev.push({ d: 'res', dest: 'LLM', e: 'Tool call: retrieve ' + r.type + ' resource with filter codes', data: 'retrieve_fhir_resource(resource_type="' + r.type + '", codes=[...])' });
    ev.push({ d: 'req', dest: 'FHIR', e: 'Retrieve resources from FHIR store' });
    ev.push({ d: 'res', dest: 'FHIR', e: r.type + ' resource received.' });
    ev.push({ d: 'req', dest: 'LLM', e: 'Extract concise facts for ' + r.type + ' resource' });
    ev.push({ d: 'res', dest: 'LLM', e: r.type + ' concise facts received.', data: r.facts });
  });
  ev.push({ d: 'req', dest: 'LLM', e: 'Generate final answer' });
  ev.push({ d: 'res', dest: 'LLM', e: 'Final Answer', final: true });
  return ev;
}
