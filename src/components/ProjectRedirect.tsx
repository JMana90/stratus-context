import { Navigate, useParams } from "react-router-dom";

const ProjectRedirect = () => {
  const { projectId } = useParams();
  return <Navigate to={`/projects/${projectId}`} replace />;
};

export default ProjectRedirect;