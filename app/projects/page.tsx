import { buildPageMetadata } from '@/lib/seo';
import { ProjectsContent } from './projects-content';

export const metadata = buildPageMetadata({
  segmentTitle: 'Projects — field project workspace',
  description:
    'Manage field projects and linked work in LORO. Authorised workspace—not indexed for search.',
  path: '/projects',
});

export default function ProjectsPage() {
  return <ProjectsContent />;
}
