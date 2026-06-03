/** Machine-translated from English — HR review recommended before production. */
import type { SalesBenchmarksContent } from './types';

export const salesBenchmarksFr: SalesBenchmarksContent = {
  noticeTitle: 'AVIS IMPORTANT',
  noticeSubtitle: 'EXIGENCES RELATIVES À LA PRIME DE FIN D’ANNÉE',
  effectiveDate: 'Date d’entrée en vigueur : 01 juin 2026',
  greeting: 'Chère équipe,',
  introParagraphs: [
    'Veuillez noter que la prime de performance de fin d’année est basée sur des exigences minimales de performance, d’assiduité, de ponctualité et de conformité tout au long de l’année.',
    'Les chiffres ci-dessous ne sont PAS des objectifs ou des objectifs ambitieux. Ce sont les exigences MINIMALES quotidiennes attendues pour votre poste.',
    'Pour rester éligible à la prime de performance de fin d’année, tous les employés doivent maintenir une performance moyenne minimale de 90 % ou plus pendant l’année.',
    'Les employés terminant l’année avec une performance moyenne inférieure à 90 % seront automatiquement disqualifiés de la prime de performance de fin d’année.',
  ],
  emphasisIntro: 'Veuillez noter :',
  emphasisBullets: [
    '90 % est le niveau minimum acceptable.',
    '89 %, 88 %, 80 % ou tout pourcentage inférieur à 90 % ne qualifie PAS.',
  ],
  minimumDailyHeading: 'EXIGENCES MINIMALES QUOTIDIENNES',
  table: {
    headers: ['Poste', 'Appels requis par jour', 'Visites requises par jour'],
    rows: [
      ['Représentants commerciaux internes', '60 appels', 'N/A'],
      ['Représentants commerciaux externes', '20 appels', '8 visites'],
      ['Chefs d’équipe de succursale', '60 appels', 'N/A'],
      ['Directeurs de succursale (avec assistant)', '20 appels', '8 visites'],
      ['Directeurs pays', '20 appels', '8 visites'],
    ],
  },
  sections: [
    {
      title: 'RÈGLES DE DISQUALIFICATION DE LA PRIME',
      intro:
        'Les employés seront automatiquement disqualifiés de la prime de performance de fin d’année si :',
      bullets: [
        'Leur performance moyenne annuelle tombe en dessous de 90 %.',
        'Ils ne respectent pas la performance minimale requise pendant 3 mois consécutifs.',
        'L’assiduité tombe en dessous de 97 % en moyenne pendant 3 mois dans l’année.',
        'Ils ont 3 retards ou plus dans un mois pendant 3 mois consécutifs.',
        'Les appels, visites ou activités ne sont pas correctement enregistrés dans le système CRM.',
      ],
    },
    {
      title: 'RÉCUPÉRATION DE PERFORMANCE',
      intro: 'Les employés peuvent récupérer leur performance moyenne au cours de l’année.',
      paragraphs: ['Exemple :'],
      bullets: [
        'Un mois à 85 %',
        'Mois suivant à 95 %+',
        'Cela peut ramener la moyenne annuelle globale au minimum requis de 90 %.',
        'Cependant, ne pas atteindre le niveau minimum requis pendant 3 mois consécutifs entraînera une disqualification automatique de la prime.',
      ],
    },
    {
      title: 'IMPORTANT',
      paragraphs: [
        'Tous les appels, visites, interactions clients et activités doivent être correctement enregistrés dans le système CRM.',
        'S’il n’est pas enregistré dans le CRM, cela sera considéré comme NON FAIT.',
        'La direction peut auditer :',
      ],
      bullets: [
        'Activité CRM',
        'Enregistrements d’appels',
        'Mouvement GPS',
        'Rapports de visite',
        'Registres d’assiduité',
        'Registres d’entrée et de sortie',
        'Retour client',
      ],
    },
  ],
  closingParagraphs: [
    'Merci pour votre engagement, votre discipline et votre dévouement.',
    'Direction',
  ],
  acknowledgeLabel: 'J’ai lu et je reconnais',
  closingSignature: 'Direction',
};
