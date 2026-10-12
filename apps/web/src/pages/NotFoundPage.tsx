import { ArrowLeft, FileQuestion } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/Card';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-12">
      <Card>
        <CardContent className="flex flex-col items-center py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-800">
            <FileQuestion className="h-6 w-6" aria-hidden="true" />
          </div>
          <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
            HTTP 404 • Route Not Found
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">Requested Page Does Not Exist</h1>
          <p className="mt-2 text-sm text-slate-600">
            The route you navigated to is not part of the PDSChain v2 Phase 1 foundation shell.
          </p>
          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <span>Return to Platform Overview</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
