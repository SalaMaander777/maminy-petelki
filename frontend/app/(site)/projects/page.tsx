import { EmptyState } from "@/components/EmptyState";
import { GRID, PageHeading, PageMain } from "@/components/PageHeading";
import { ProjectsGrid } from "@/components/ProjectsGrid";
import { getProjects, getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/page-meta";
import { pageOf } from "@/lib/site";

export const generateMetadata = () => pageMetadata("projects");

export default async function ProjectsPage() {
  const [{ pages }, projects] = await Promise.all([getSite(), getProjects()]);
  const page = pageOf(pages, "projects");
  return (
    <PageMain>
      <PageHeading title={page.title} subtitle={page.subtitle} />
      {projects.length === 0 ? (
        <EmptyState message="Скоро здесь появятся наши проекты — загляните позже" />
      ) : (
        <ProjectsGrid projects={projects} gridClass={GRID} />
      )}
    </PageMain>
  );
}
