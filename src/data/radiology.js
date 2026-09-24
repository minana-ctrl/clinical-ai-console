// Extracted verbatim from the Claude Design source, 'Clinical AI Console.dc.html'.
// Radiology explainer — report sentences paired with plain-language readings.

export const radBase = 'https://huggingface.co/spaces/google/rad_explain/resolve/main/static/images/';

export const radCases = [
  { name: 'Effusion', modality: 'CXR', label: 'Chest X-ray', file: 'Effusion2.jpg', sentences: [
    { t: 'FINDINGS: No pneumothorax.', e: 'There is no air trapped between the lung and the chest wall, which would need urgent treatment.' },
    { t: 'Small to medium right pleural effusion with adjacent right basilar atelectasis.', e: 'A small to moderate amount of fluid has collected around your right lung. Look at the bottom left of the image — that is your right side — where the sharp corner of the lung is filled in. The lung base just above it is partly squashed by the fluid, so it is not fully inflated.' },
    { t: 'No substantial left pleural effusion.', e: 'There is no significant fluid on the other side.' },
    { t: 'Normal heart size.', e: 'Your heart is a normal size.' },
    { t: 'Mediastinal shadow within normal limits.', e: 'The structures in the middle of the chest — the windpipe, the great vessels and the space between the lungs — look normal.' },
    { t: 'No acute skeletal abnormality is apparent.', e: 'The ribs, collarbones and spine show no recent injury.' },
    { t: 'IMPRESSION: Small to medium right pleural effusion.', e: 'Overall: a small to moderate collection of fluid around the right lung.' }
  ] },
  { name: 'Infection', modality: 'CXR', label: 'Chest X-ray', file: 'Infection.jpg', sentences: [
    { t: 'FINDINGS: Patchy airspace opacification is present in the right lower lobe.', e: 'There is a cloudy patch in the lower part of your right lung — low on the left of the image, since your right side faces the left of the image. That hazy, patchy whiteness is what an infection in the lung tissue looks like.' },
    { t: 'Air bronchograms are seen within the affected area.', e: 'Dark branching lines are visible inside the cloudy patch — the airways are still open while the lung around them is filled with fluid. That supports infection.' },
    { t: 'No pleural effusion is identified.', e: 'No fluid has collected around the lung.' },
    { t: 'The left lung is clear.', e: 'The other lung looks normal.' },
    { t: 'IMPRESSION: Findings are consistent with right lower lobe pneumonia.', e: 'Overall: pneumonia in the lower part of the right lung.' }
  ] },
  { name: 'Lymphadenopathy', modality: 'CXR', label: 'Chest X-ray', file: 'Lymphadenopathy2.jpg', sentences: [
    { t: 'FINDINGS: There is bilateral hilar enlargement with lobulated contours.', e: 'Look either side of the centre of the image, roughly level with the middle of the heart. The areas where the airways and blood vessels enter each lung look enlarged, with bumpy rather than smooth outlines. That usually means swollen lymph nodes.' },
    { t: 'The right paratracheal stripe is widened.', e: 'Follow your windpipe down the middle of the image; the band of tissue running alongside it, just to the left of centre, is thicker than usual. Another sign of swollen nodes.' },
    { t: 'The lungs are clear of focal consolidation.', e: 'The lung tissue itself shows no sign of infection.' },
    { t: 'Heart size is normal.', e: 'Your heart is a normal size.' },
    { t: 'IMPRESSION: Bilateral hilar and right paratracheal lymphadenopathy. Sarcoidosis, tuberculosis and lymphoma should be considered.', e: 'Overall: swollen lymph nodes on both sides of the chest. Several different conditions can cause this, so further tests are needed to tell them apart.' }
  ] },
  { name: 'Nodule A', modality: 'CXR', label: 'Chest X-ray', file: 'Nodule3.jpg', sentences: [
    { t: 'FINDINGS: A well-circumscribed nodule measuring approximately 1.5 cm is seen in the right mid zone.', e: 'There is a small round spot, about the size of a pea, in the middle part of your right lung — halfway down the left side of the image, since your right side faces the left of the image.' },
    { t: 'The margins are smooth and there is no associated cavitation.', e: 'The edge of the spot is even and there is no hole inside it. Smooth edges are more often a sign of something harmless.' },
    { t: 'No pleural effusion or hilar enlargement.', e: 'There is no fluid around the lungs and no swollen glands in the centre of the chest.' },
    { t: 'The remainder of the lungs is clear.', e: 'The rest of both lungs looks normal.' },
    { t: 'IMPRESSION: Solitary pulmonary nodule in the right mid zone. Comparison with prior imaging or CT follow-up is recommended.', e: 'Overall: one small spot in the right lung. The next step is to compare it with older X-rays, or take a CT scan, to see whether it has changed.' }
  ] },
  { name: 'Nodule B', modality: 'CXR', label: 'Chest X-ray', file: 'Nodule5.jpg', sentences: [
    { t: 'FINDINGS: An ill-defined nodular opacity is present in the left upper zone.', e: 'There is a small hazy spot high in your left lung — upper right of the image, since your left side faces the right of the image — and its edges are not sharp.' },
    { t: 'The lesion measures approximately 2 cm and has irregular margins.', e: 'The spot is about 2 cm across — roughly the width of a fingernail — and its edge is ragged rather than smooth. Ragged edges need closer attention.' },
    { t: 'There is no rib destruction.', e: 'The ribs around the spot are intact.' },
    { t: 'The right lung is clear.', e: 'The other lung looks normal.' },
    { t: 'IMPRESSION: Irregular left upper zone nodule. CT of the chest is recommended for further characterisation.', e: 'Overall: an irregular spot in the left lung that needs a CT scan to be looked at properly.' }
  ] },
  { name: 'Tumor', modality: 'CT', label: 'CT chest', file: 'CT-Tumor.jpg', sentences: [
    { t: 'FINDINGS: Mass effect and endobronchial tumor invasion result in severe focal stenosis of right middle lobar bronchus.', e: 'A growth is pressing on — and growing into — one of the airways in the right lung, narrowing it severely.' },
    { t: 'Subsegmental mucus plugging in lateral segment right middle lobe, peripheral to central right middle lobe lung mass (described below).', e: 'Because that airway is blocked, mucus has collected in the small branches beyond it.' },
    { t: 'No pneumothorax. No pleural effusion.', e: 'There is no air trapped outside the lung and no fluid around it.' },
    { t: 'Right middle lobe hyperlucency, compatible with lobar air trapping.', e: 'That part of the right lung looks darker than usual on the scan, because air is getting in but struggling to get back out.' },
    { t: 'Solid, well-circumscribed, enhancing 33 x 25 mm central right middle lobe lung mass.', e: 'There is a solid lump about 33 by 25 mm — a little over 3 cm — near the centre of the right lung. Its edges are clearly defined, and it takes up contrast dye.' },
    { t: 'No consolidation elsewhere. Very mild dependent atelectasis in lower lobes.', e: 'No infection is seen elsewhere. Small areas at the back of both lower lungs are slightly under-inflated, which is common from lying still during the scan.' },
    { t: 'Subsolid 3 mm nodule in posteromedial right upper lobe.', e: 'A separate, very small hazy spot — 3 mm, about the size of a grain of rice — sits in the upper right lung.' },
    { t: 'Enlargement of right heart chambers. No pericardial effusion. No thoracic aortic aneurysm. Mild thymic hyperplasia.', e: 'The right side of the heart is bigger than expected. There is no fluid around the heart and no bulge in the main artery. The thymus gland is slightly enlarged.' },
    { t: 'No bulky thoracic lymphadenopathy.', e: 'The lymph nodes in the chest are not noticeably swollen, so there is no obvious sign of spread to them.' },
    { t: 'Cholelithiasis.', e: 'Gallstones were seen at the edge of the scan — an incidental finding, unrelated to the lung.' },
    { t: 'No aggressive destructive skeletal focus. Mild thoracic spine degenerative disk disease.', e: 'The bones show no sign of being eaten away. There is mild wear and tear in the discs of the upper spine.' },
    { t: 'IMPRESSION: Solid, enhancing 33 x 25 mm central right middle lobe lung mass with apparent endobronchial invasion and associated right middle lobe air trapping; imaging features favor carcinoid tumor.', e: 'Overall: a 3 cm lump in the right lung that has grown into an airway and is trapping air behind it. The appearance most suggests a carcinoid tumour, a slow-growing type of lung tumour.' },
    { t: 'No bulky thoracic lymphadenopathy. Nonspecific 3 mm right upper lobe lung nodule.', e: 'No enlarged chest lymph nodes. The tiny 3 mm spot in the upper right lung has no specific cause on this scan.' },
    { t: 'RECOMMENDATION: Pulmonary consultation.', e: 'Next step: see a lung specialist.' }
  ] }
];
