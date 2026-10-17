export function matchSchemes(profile) {
  const age = Number(profile.age),
    income = Number(profile.income);
  const knownAge = profile.age !== "" && Number.isFinite(age);
  const knownIncome = profile.income !== "" && Number.isFinite(income);
  const evaluate = (id, title, description, rules) => {
    const failed = rules.filter((r) => r[0] === false).map((r) => r[1]);
    const unknown = rules.filter((r) => r[0] === null).map((r) => r[1]);
    return {
      id,
      title,
      description,
      status: failed.length
        ? "Not a match"
        : unknown.length
          ? "More details needed"
          : "Potential match",
      reasons: failed.length
        ? failed
        : unknown.length
          ? unknown
          : [
              "Your answers meet these initial checks. The official scheme makes the final decision.",
            ],
    };
  };
  const ageRule = (min, max) => [
    knownAge ? age >= min && age <= max : null,
    `Entry age ${min}${max === Infinity ? " or older" : `–${max}`}`,
  ];
  const noCoverage =
    profile.coverage === "unknown" ? null : profile.coverage === "no";
  const bank = profile.bank === "unknown" ? null : profile.bank === "yes";
  return [
    evaluate(
      "eshram",
      "e-Shram",
      "Registration for unorganised workers; registration alone does not guarantee money.",
      [
        ageRule(16, Infinity),
        [
          noCoverage,
          "Not covered by EPFO, ESIC or government-funded NPS, and not a government employee.",
        ],
      ],
    ),
    evaluate(
      "pmsym",
      "PM-SYM pension",
      "A contributory pension scheme. Monthly contributions apply.",
      [
        ageRule(18, 40),
        [
          knownIncome ? income <= 15000 : null,
          "Monthly income of ₹15,000 or less",
        ],
        [noCoverage, "No EPFO, ESIC or NPS coverage"],
        [
          profile.tax === "unknown" ? null : profile.tax === "no",
          "Not an income-tax payer",
        ],
        [bank, "A savings or Jan Dhan account is needed"],
      ],
    ),
    evaluate(
      "pmjjby",
      "PMJJBY life insurance",
      "Voluntary bank-linked life cover. Premiums and conditions apply.",
      [
        ageRule(18, 50),
        [bank, "A participating bank or post-office account is needed"],
      ],
    ),
    evaluate(
      "pmsby",
      "PMSBY accident insurance",
      "Voluntary accident cover. This is not general health insurance.",
      [
        ageRule(18, 69),
        [bank, "A participating bank or post-office account is needed"],
      ],
    ),
    evaluate(
      "mahabocw",
      "Maharashtra construction worker board",
      "Registration can open access to board benefits, subject to scheme rules.",
      [
        ageRule(18, 59),
        [
          profile.state
            ? profile.state.toLowerCase().includes("maharashtra")
            : null,
          "Currently working in Maharashtra",
        ],
        [
          profile.role ? profile.role === "Construction worker" : null,
          "Construction work",
        ],
        [
          profile.days !== "" ? Number(profile.days) > 90 : null,
          "More than 90 days of construction work in the last 12 months",
        ],
      ],
    ),
  ];
}
