import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState.jsx';

export function GroupDetailPage() {
  const { groupId } = useParams();

  return (
    <section className="screen">
      <EmptyState
        title="Group detail coming soon"
        message={`Group detail for ${groupId} will return when it is backed by the database API.`}
        action={
          <Link className="button" to="/groups">
            Back to Groups
          </Link>
        }
      />
    </section>
  );
}
