"use client";

import React, { useMemo } from "react";
import {
  DIRECTORY,
  DirectoryPerson,
  FULL_DETAIL,
  HEALTH_RECORDS,
  matchesFor,
  uniqueMatchCount,
} from "./types";

interface Props {
  selectedName: string | null;
  onSelectPerson: (name: string) => void;
  /** name -> number of matching released records, for everyone attempted. */
  attempted: ReadonlyMap<string, number>;
  reIdentifiedCount: number;
}

function attemptBadge(count: number | undefined): React.ReactNode {
  if (count === undefined) return null;
  if (count === 1) {
    return (
      <span className="text-[10px] font-semibold text-[var(--color-warning)]">
        re-identified
      </span>
    );
  }
  if (count === 0) {
    return (
      <span className="text-[10px] font-semibold text-[var(--color-success)]">
        no match
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-[#94a3b8]">
      {count} candidates
    </span>
  );
}

export default function AttackPhase({
  selectedName,
  onSelectPerson,
  attempted,
  reIdentifiedCount,
}: Props) {
  const selectedPerson: DirectoryPerson | null = useMemo(
    () => DIRECTORY.find((p) => p.name === selectedName) ?? null,
    [selectedName]
  );

  const matches = useMemo(
    () => (selectedPerson ? matchesFor(selectedPerson, FULL_DETAIL) : []),
    [selectedPerson]
  );
  const matchedIds = useMemo(
    () => new Set(matches.map((m) => m.id)),
    [matches]
  );

  const totalUnique = useMemo(() => uniqueMatchCount(FULL_DETAIL), []);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Public directory */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-white mb-1">
            Midvale voter roll (public)
          </p>
          <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
            Anyone can look these {DIRECTORY.length} neighbors up. Pick a
            person to run the join on ZIP + age + gender.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left font-semibold px-3 py-2">Name</th>
                  <th className="text-left font-semibold px-3 py-2">ZIP</th>
                  <th className="text-left font-semibold px-3 py-2">Age</th>
                  <th className="text-left font-semibold px-3 py-2">Gender</th>
                  <th className="text-right font-semibold px-3 py-2">Attack</th>
                </tr>
              </thead>
              <tbody>
                {DIRECTORY.map((p, i) => {
                  const isSelected = p.name === selectedName;
                  return (
                    <tr
                      key={p.name}
                      className={
                        isSelected
                          ? "bg-[#1e293b]"
                          : i % 2 === 0
                            ? "bg-[#0f172a]"
                            : "bg-[#162032]"
                      }
                    >
                      <td className="px-3 py-1.5 text-[#f1f5f9] font-medium whitespace-nowrap">
                        {p.name}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[#94a3b8]">
                        {p.zip}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[#94a3b8]">
                        {p.age}
                      </td>
                      <td className="px-3 py-1.5 text-[#94a3b8]">{p.gender}</td>
                      <td className="px-3 py-1.5 text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          {attemptBadge(attempted.get(p.name))}
                          <button
                            onClick={() => onSelectPerson(p.name)}
                            aria-label={`Try to re-identify ${p.name} by linking on ZIP, age, and gender`}
                            aria-pressed={isSelected}
                            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                              isSelected
                                ? "border-[var(--color-accent)] text-[var(--color-accent)]"
                                : "border-[#334155] text-[#94a3b8] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
                            }`}
                          >
                            Link
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Released hospital table */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-white mb-1">
            Midvale Clinic release (&quot;anonymized&quot;)
          </p>
          <p className="text-[11px] text-[#475569] mb-3 leading-relaxed">
            {HEALTH_RECORDS.length} discharge records. Names were deleted
            before publication; ZIP, age, and gender were kept for research
            value.
          </p>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto rounded-lg">
            <table className="w-full border-collapse text-[12px]">
              <thead className="sticky top-0">
                <tr className="bg-[#1e293b] text-[#94a3b8]">
                  <th className="text-left font-semibold px-3 py-2">Name</th>
                  <th className="text-left font-semibold px-3 py-2">ZIP</th>
                  <th className="text-left font-semibold px-3 py-2">Age</th>
                  <th className="text-left font-semibold px-3 py-2">Gender</th>
                  <th className="text-left font-semibold px-3 py-2">
                    Diagnosis
                  </th>
                </tr>
              </thead>
              <tbody>
                {HEALTH_RECORDS.map((r, i) => {
                  const isMatch = matchedIds.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      className={
                        isMatch
                          ? "bg-[#1e293b]"
                          : i % 2 === 0
                            ? "bg-[#0f172a]"
                            : "bg-[#162032]"
                      }
                    >
                      <td className="px-3 py-1.5 text-[#475569] italic whitespace-nowrap">
                        removed
                        {isMatch && (
                          <span className="not-italic text-[10px] font-semibold text-[var(--color-warning)] ml-1.5">
                            match
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[#94a3b8]">
                        {r.zip}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-[#94a3b8]">
                        {r.age}
                      </td>
                      <td className="px-3 py-1.5 text-[#94a3b8]">{r.gender}</td>
                      <td className="px-3 py-1.5 text-[#f1f5f9] whitespace-nowrap">
                        {r.diagnosis}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Join verdict */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2 rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Join result
          </p>
          {selectedPerson === null ? (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              Pick a neighbor on the left. The join keeps every released record
              whose ZIP, age, and gender all equal theirs.
            </p>
          ) : matches.length === 1 ? (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <span className="font-semibold text-[var(--color-warning)]">
                {selectedPerson.name} is re-identified.
              </span>{" "}
              Exactly one record shares ZIP {selectedPerson.zip}, age{" "}
              {selectedPerson.age}, gender {selectedPerson.gender}, so the
              &quot;anonymous&quot; row is theirs. Their diagnosis,{" "}
              <span className="font-semibold text-[#f1f5f9]">
                {matches[0].diagnosis}
              </span>
              , just became public.
            </p>
          ) : matches.length === 0 ? (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <span className="font-semibold text-[var(--color-success)]">
                No record matches {selectedPerson.name}.
              </span>{" "}
              They are probably not in the clinic data at all. Absence of a
              match is the only safe outcome here.
            </p>
          ) : (
            <p className="text-[12px] text-[#94a3b8] leading-relaxed">
              <span className="font-semibold text-[#f1f5f9]">
                {matches.length} records match {selectedPerson.name}.
              </span>{" "}
              The attacker cannot tell which row is theirs, so this person is
              hiding in a crowd of {matches.length}. That crowd size is exactly
              the k you will engineer in the defense below.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-4">
          <p className="text-[10px] text-[#475569] uppercase tracking-wide mb-1">
            Your re-identifications
          </p>
          <p className="text-2xl font-black font-mono text-[var(--color-warning)]">
            {reIdentifiedCount}
          </p>
          <p className="text-[10px] text-[#475569] mt-1">
            of {totalUnique} neighbors who link to exactly one record
          </p>
        </div>
      </div>
    </div>
  );
}
