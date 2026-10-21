/** Same CV as `CV` in the back end's tests/test_docx_gen.py. */
export const CV = {
  cv_introduction: 'Software Engineer, Lille',
  profile_text: 'Six years on distributed backends.',
  skills: [
    { competence: 'Go', skills: ['Go', 'gRPC'] },
    { competence: 'Cloud', skills: ['Kubernetes', 'Terraform'] },
  ],
  experiences: [
    {
      role: 'Backend Engineer', company: 'Acme', location: 'Lille, France',
      start_date: 'January, 2022', end_date: 'Present',
      bullets: ['Cut p99 latency by 40%.', 'Owned the release train.'],
    },
    {
      role: 'Junior Engineer', company: 'Beta', location: 'Paris, France',
      start_date: 'January, 2020', end_date: 'December, 2021',
      bullets: ['Built the onboarding flow.'],
    },
  ],
  education: [
    {
      diploma: 'MSc', institution: 'Centrale', location: 'Lille',
      period: '2019 - 2021', degree: 'Computer Science', details: 'GPA 3.9',
    },
    {
      diploma: 'BSc', institution: 'USP', location: 'Sao Paulo',
      period: '2015 - 2019', degree: 'Engineering', details: '   ',
    },
  ],
};

export const GENERATED = { cv_id: 'c1', job_id: 'j1', title: 'Go Dev', company: 'Acme',
  adequation_grade: 80, locale: 'fr', cv: CV };

export const PROFILE = {
  name: 'Ana Souza',
  contact: 'ana@example.com | Lille',
  languages: ['{language_fr}, C1 - {LEVEL_FLUENT}', '  '],
};
