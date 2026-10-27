import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="container page empty-state">
      <h1>This listing isn't available</h1>
      <p className="muted">It may have been rented out or moved. Have a look at the other rooms instead.</p>
      <Link to="/rooms" className="btn btn-primary">Browse all rooms</Link>
    </div>
  );
}
