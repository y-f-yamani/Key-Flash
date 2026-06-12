import { NextResponse } from 'next/server';

/** RFC 7807 problem responses — the API-wide error convention (docs/06). */
export function problem(status: number, type: string, detail: string): NextResponse {
  return NextResponse.json(
    { type: `https://keymaster.app/problems/${type}`, title: type, status, detail },
    { status, headers: { 'content-type': 'application/problem+json' } },
  );
}
