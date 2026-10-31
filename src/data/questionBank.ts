import { Question } from "../types";

export const QUESTION_BANK: Question[] = [
  // =========================================================================
  // 10 DIAGNOSTIC QUESTIONS (1 per Concept, Mixed MCQ + Short Answer)
  // =========================================================================
  {
    id: "diag-db-fund-1",
    conceptId: "db-fundamentals",
    difficulty: 1,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "A university migrates its `Enrollments` table from heap files to a B+Tree index on disk without rewriting any application SQL queries. Which DBMS property directly enables this?",
    options: [
      "Physical data independence",
      "Logical data independence",
      "Referential integrity enforcement",
      "Two-phase locking",
    ],
    expectedAnswer: "Physical data independence",
    acceptableKeywords: ["physical", "internal schema", "storage", "conceptual"],
    explanation:
      "Physical data independence insulates the conceptual schema and application queries from changes in the internal/physical storage layer (such as file organization or B+Tree indexing). Logical data independence instead protects external views when the conceptual table structure changes.",
    misconceptionTags: ["physical-vs-logical-independence"],
    misconceptionRules: [
      {
        tag: "physical-vs-logical-independence",
        triggerPatterns: ["logical data independence", "logical independence"],
        wrongOptionMatch: "Logical data independence",
        diagnosis:
          "Confused logical data independence (conceptual schema changes like splitting tables) with physical data independence (internal disk/index layout changes).",
        remediation:
          "Ask which boundary moved: disk/index changes happen between the Internal and Conceptual levels (Physical Independence), whereas table/column restructuring happens between Conceptual and External View levels (Logical Independence).",
      },
    ],
  },
  {
    id: "diag-tables-1",
    conceptId: "tables-rows-columns",
    difficulty: 1,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "In a strict relational table `Students(student_id, name, gpa)` containing 4 columns and 250 rows where 12 rows have `gpa = NULL`, what does the predicate `gpa = NULL` evaluate to in SQL three-valued logic?",
    options: [
      "UNKNOWN for every row (including the 12 rows where gpa is NULL)",
      "TRUE for the 12 rows where gpa is NULL, FALSE for the rest",
      "FALSE for all 250 rows",
      "A syntax error in ANSI SQL",
    ],
    expectedAnswer: "UNKNOWN for every row (including the 12 rows where gpa is NULL)",
    acceptableKeywords: ["unknown", "three-valued", "is null", "missing"],
    explanation:
      "In SQL's three-valued logic, NULL represents an unknown or missing value—not a concrete scalar. Comparing anything to NULL using `=` or `!=` yields UNKNOWN, so `WHERE gpa = NULL` filters out every row. You must use `IS NULL`.",
    misconceptionTags: ["null-equality-trap"],
    misconceptionRules: [
      {
        tag: "null-equality-trap",
        triggerPatterns: ["null equals null", "true for the 12", "both are null"],
        wrongOptionMatch: "TRUE for the 12 rows where gpa is NULL, FALSE for the rest",
        diagnosis:
          "Treated NULL as a regular literal value where `NULL = NULL` evaluates to TRUE rather than UNKNOWN.",
        remediation:
          "Think of NULL as 'unknown age': if Alice's age is unknown and Bob's age is unknown, you cannot conclude their ages are equal—the comparison result is UNKNOWN.",
      },
    ],
  },
  {
    id: "diag-pk-1",
    conceptId: "primary-keys",
    difficulty: 1,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "Suppose `CourseSection(course_code, semester, section_no, room)` has composite primary key `(course_code, semester, section_no)`. Which insertion violates Entity Integrity?",
    options: [
      "Inserting ('CS301', NULL, 1, 'Hall-B') even if no other row has NULL",
      "Inserting ('CS301', 'Fall26', 2, NULL) when 'CS301', 'Fall26', 1 already exists",
      "Inserting ('CS302', 'Fall26', 1, 'Hall-B') when 'CS301', 'Fall26', 1 uses 'Hall-B'",
      "Having two rows with the same `course_code` 'CS301' in different semesters",
    ],
    expectedAnswer: "Inserting ('CS301', NULL, 1, 'Hall-B') even if no other row has NULL",
    acceptableKeywords: ["entity integrity", "not null", "composite", "component"],
    explanation:
      "Entity Integrity requires that NO attribute participating in a primary key (even one column of a composite primary key) can ever be NULL, and the combined tuple `(course_code, semester, section_no)` must be unique.",
    misconceptionTags: ["composite-pk-partial-null", "composite-pk-individual-uniqueness"],
    misconceptionRules: [
      {
        tag: "composite-pk-individual-uniqueness",
        triggerPatterns: ["same course_code", "each column must be unique"],
        wrongOptionMatch: "Having two rows with the same `course_code` 'CS301' in different semesters",
        diagnosis:
          "Assumed every individual attribute of a composite primary key must be unique on its own rather than unique as a combined tuple.",
        remediation:
          "In a composite key `(A, B)`, column `A` can repeat across rows and column `B` can repeat across rows—only the combined pair `(A, B)` must be unique, and neither `A` nor `B` may be NULL.",
      },
    ],
  },
  {
    id: "diag-ck-1",
    conceptId: "candidate-superkeys",
    difficulty: 2,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "In relation `Employee(emp_id, ssn, dept_id, full_name)`, both `emp_id` and `ssn` are unique for every employee. Which statement accurately classifies `{emp_id, full_name}`?",
    options: [
      "It is a superkey, but NOT a candidate key because `{emp_id}` is already unique",
      "It is both a superkey and a composite candidate key",
      "It is a candidate key, but NOT a superkey",
      "It is neither a superkey nor a candidate key because `full_name` is non-unique",
    ],
    expectedAnswer:
      "It is a superkey, but NOT a candidate key because `{emp_id}` is already unique",
    acceptableKeywords: ["superkey", "minimal", "proper subset", "redundant"],
    explanation:
      "`{emp_id, full_name}` uniquely identifies every row, so it is a superkey. However, removing `full_name` leaves `{emp_id}`, which still uniquely identifies every row. Because it contains a redundant attribute, it fails minimality and is not a candidate key.",
    misconceptionTags: ["superkey-minimality-confusion"],
    misconceptionRules: [
      {
        tag: "superkey-minimality-confusion",
        triggerPatterns: ["same", "both uniquely identify", "composite candidate"],
        wrongOptionMatch: "It is both a superkey and a composite candidate key",
        diagnosis:
          "Equated superkeys and candidate keys by checking uniqueness alone without checking minimality (no proper subset is a superkey).",
        remediation:
          "Every candidate key is a minimal superkey. Always test whether dropping any attribute keeps the set unique—if so, the larger set is strictly a non-minimal superkey.",
      },
    ],
  },
  {
    id: "diag-fd-1",
    conceptId: "functional-dependencies",
    difficulty: 2,
    type: "short_answer",
    isDiagnostic: true,
    prompt:
      "Given relation `R(A, B, C, D)` with functional dependencies `A → B`, `B → C`, and `BC → D`, list all attributes in the attribute closure `{A}+` (comma-separated or concatenated, e.g., ABCD).",
    expectedAnswer: "ABCD",
    acceptableAnswers: [
      "abcd",
      "a, b, c, d",
      "{a, b, c, d}",
      "{a,b,c,d}",
      "a b c d",
      "a,b,c,d",
    ],
    acceptableKeywords: ["a", "b", "c", "d", "closure", "transitive"],
    explanation:
      "Start with `{A}+ = {A}`. Using `A → B`, add `B` to get `{A, B}`. Using `B → C`, add `C` to get `{A, B, C}`. Now both `B` and `C` are present, so `BC → D` fires and adds `D`, giving `{A, B, C, D}` (so `A` is a candidate key of `R`).",
    misconceptionTags: ["incomplete-closure-propagation"],
  },
  {
    id: "diag-nf-1",
    conceptId: "normal-forms-1-2-3",
    difficulty: 2,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "Relation `OrderLine(order_id, product_id, product_name, quantity)` has sole candidate key `(order_id, product_id)` and functional dependency `product_id → product_name`. What is the HIGHEST normal form this relation currently satisfies?",
    options: [
      "1NF only (violates 2NF due to a partial dependency)",
      "2NF only (violates 3NF due to a transitive dependency)",
      "3NF",
      "Not even 1NF",
    ],
    expectedAnswer: "1NF only (violates 2NF due to a partial dependency)",
    acceptableKeywords: ["1nf", "partial dependency", "proper subset", "composite key"],
    explanation:
      "All attributes are atomic (so it is in 1NF). However, non-prime attribute `product_name` depends on `product_id` alone—a proper subset of the composite candidate key `(order_id, product_id)`. That is a partial dependency, which directly violates 2NF.",
    misconceptionTags: ["partial-vs-transitive-dependency"],
  },
  {
    id: "diag-bcnf-1",
    conceptId: "bcnf",
    difficulty: 3,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "Relation `AdvisorAssignment(student_id, major, advisor_id)` has FDs `(student_id, major) → advisor_id` and `advisor_id → major`. Its candidate keys are `(student_id, major)` and `(student_id, advisor_id)`. Which statement is true?",
    options: [
      "It is in 3NF (since `major` is a prime attribute), temporary/exempt in 3NF, but violates BCNF because `advisor_id` is not a superkey",
      "It violates both 3NF and BCNF because `advisor_id → major` is a transitive dependency",
      "It satisfies both 3NF and BCNF",
      "It violates 2NF because `advisor_id → major` is a partial dependency",
    ],
    expectedAnswer:
      "It is in 3NF (since `major` is a prime attribute), temporary/exempt in 3NF, but violates BCNF because `advisor_id` is not a superkey",
    acceptableKeywords: ["prime attribute", "3nf", "bcnf", "superkey", "advisor_id"],
    explanation:
      "Because `major` belongs to candidate key `(student_id, major)`, `major` is a prime attribute—which satisfies 3NF's exception (`X` is a superkey OR `Y` is prime). BCNF removes the prime-attribute exception: every non-trivial FD `X → Y` requires `X` to be a superkey. Since `advisor_id` alone is not a superkey, BCNF is violated.",
    misconceptionTags: ["3nf-vs-bcnf-prime-exception"],
  },
  {
    id: "diag-sql-1",
    conceptId: "sql-queries",
    difficulty: 2,
    type: "short_answer",
    isDiagnostic: true,
    prompt:
      "In SQL, which clause must be used instead of `WHERE` to filter grouped rows using an aggregate condition such as `AVG(score) >= 75`?",
    expectedAnswer: "HAVING",
    acceptableAnswers: ["having", "having clause", "the having clause"],
    acceptableKeywords: ["having", "group by", "aggregate"],
    explanation:
      "`WHERE` executes before `GROUP BY` and filters individual base rows, so aggregate functions like `AVG(score)` cannot appear in `WHERE`. `HAVING` executes after `GROUP BY` and filters entire groups based on aggregate results.",
    misconceptionTags: ["where-vs-having-execution-order"],
  },
  {
    id: "diag-joins-1",
    conceptId: "joins",
    difficulty: 2,
    type: "multiple_choice",
    isDiagnostic: true,
    prompt:
      "You want every department from `Departments d`—including departments with zero employees—alongside how many employees earned a bonus in 2026. What happens if you write `FROM Departments d LEFT JOIN Employees e ON d.id = e.dept_id WHERE e.bonus_year = 2026`?",
    options: [
      "Departments with zero employees are dropped because `e.bonus_year` is NULL and fails the `WHERE` filter, effectively turning the LEFT JOIN into an INNER JOIN",
      "Every department still appears with a count of 0 when it has no matching 2026 employees",
      "SQL raises a runtime error because `WHERE` cannot follow `LEFT JOIN`",
      "Departments with zero employees appear twice with NULL counts",
    ],
    expectedAnswer:
      "Departments with zero employees are dropped because `e.bonus_year` is NULL and fails the `WHERE` filter, effectively turning the LEFT JOIN into an INNER JOIN",
    acceptableKeywords: ["null", "where", "inner join", "on clause", "dropped"],
    explanation:
      "For unmatched departments, `LEFT JOIN` pads `e.*` columns with NULL. Evaluating `WHERE e.bonus_year = 2026` on `NULL = 2026` produces UNKNOWN, discarding those rows! To preserve unmatched left rows, move `AND e.bonus_year = 2026` into the `ON` clause.",
    misconceptionTags: ["outer-join-where-null-rejection"],
  },
  {
    id: "diag-acid-1",
    conceptId: "transactions-acid",
    difficulty: 2,
    type: "short_answer",
    isDiagnostic: true,
    prompt:
      "Transaction T1 deducts $500 from Account A, then the server crashes before T1 adds $500 to Account B or commits. Upon recovery, the DBMS undoes the deduction so neither change persists. Which single ACID property guarantees this 'all-or-nothing' behavior?",
    expectedAnswer: "Atomicity",
    acceptableAnswers: ["atomicity", "atomic", "a (atomicity)"],
    acceptableKeywords: ["atomicity", "all-or-nothing", "undo", "rollback"],
    explanation:
      "Atomicity guarantees that a transaction executes as an indivisible 'all-or-nothing' unit: if it aborts or crashes mid-flight, the recovery manager uses UNDO log records to roll back partial writes. Durability instead guarantees committed transactions survive crashes.",
    misconceptionTags: ["atomicity-vs-durability-confusion"],
  },

  // =========================================================================
  // ADAPTIVE PRACTICE & REVISION QUESTION BANK (24 Questions across Tiers 1-3)
  // =========================================================================
  {
    id: "prac-ck-1",
    conceptId: "candidate-superkeys",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Consider relation `PassportRecord(passport_no, country_code, holder_email, birth_year)` where `(passport_no, country_code)` is minimal and unique, and `holder_email` alone is also unique for every row. How many candidate keys does this relation have, and is `{holder_email, birth_year}` a candidate key?",
    options: [
      "2 candidate keys; `{holder_email, birth_year}` is a superkey but NOT a candidate key",
      "3 candidate keys, including `{holder_email, birth_year}` because it uniquely identifies rows",
      "1 candidate key because a table can only have one candidate key",
      "2 candidate keys; `{holder_email, birth_year}` is neither a superkey nor a candidate key",
    ],
    expectedAnswer:
      "2 candidate keys; `{holder_email, birth_year}` is a superkey but NOT a candidate key",
    acceptableKeywords: ["minimal", "superkey", "subset", "holder_email", "redundant"],
    explanation:
      "A relation can have multiple candidate keys: here both `{passport_no, country_code}` and `{holder_email}` are minimal superkeys (2 candidate keys). Adding `birth_year` to `holder_email` still uniquely identifies rows (so it is a superkey), but `birth_year` is unnecessary—making `{holder_email, birth_year}` non-minimal and therefore not a candidate key.",
    misconceptionTags: ["superkey-minimality-confusion", "single-candidate-key-myth"],
    sampleDictatedMisconception: {
      label: "Test Wispr Flow misconception: Superkey vs Candidate Key",
      answer:
        "3 candidate keys, including `{holder_email, birth_year}` because it uniquely identifies rows",
      reasoning:
        "Um, okay so let me think out loud—holder_email is unique and passport_no with country_code is unique, wait, I think a superkey and a candidate key are the same because both uniquely identify a row, so holder_email plus birth_year also uniquely identifies every row which makes all three candidate keys.",
    },
    misconceptionRules: [
      {
        tag: "superkey-minimality-confusion",
        triggerPatterns: [
          "superkey and a candidate key are the same",
          "both uniquely identify",
          "uniquely identifies every row which makes",
          "same thing",
        ],
        wrongOptionMatch:
          "3 candidate keys, including `{holder_email, birth_year}` because it uniquely identifies rows",
        diagnosis:
          "Equated superkeys with candidate keys based solely on row uniqueness, overlooking the minimality (irreducibility) requirement.",
        remediation:
          "Every candidate key is a minimal superkey, whereas a general superkey may contain unnecessary extra attributes. Because `{holder_email}` already uniquely identifies each row on its own, `{holder_email, birth_year}` has a proper subset that is a superkey—so it is a superkey, not a candidate key.",
      },
      {
        tag: "single-candidate-key-myth",
        triggerPatterns: ["only have one", "one primary"],
        wrongOptionMatch: "1 candidate key because a table can only have one candidate key",
        diagnosis:
          "Confused the rule 'at most one Primary Key per table' with Candidate Keys—a relation can have several candidate keys.",
        remediation:
          "A table designates at most ONE primary key, chosen from potentially many candidate keys (the unchosen candidate keys are called alternate keys).",
      },
    ],
  },
  {
    id: "prac-ck-2",
    conceptId: "candidate-superkeys",
    difficulty: 3,
    type: "short_answer",
    prompt:
      "Relation `Schedule(room_id, time_slot, course_id, instructor_id)` has candidate keys `(room_id, time_slot)` and `(instructor_id, time_slot)`. List all PRIME attributes of `Schedule`.",
    expectedAnswer: "room_id, time_slot, instructor_id",
    acceptableAnswers: [
      "room_id, time_slot, instructor_id",
      "{room_id, time_slot, instructor_id}",
      "instructor_id, room_id, time_slot",
      "time_slot, room_id, instructor_id",
    ],
    acceptableKeywords: ["room_id", "time_slot", "instructor_id", "candidate"],
    explanation:
      "An attribute is prime if it belongs to AT LEAST ONE candidate key (not just the chosen primary key). Taking the union of `(room_id, time_slot)` and `(instructor_id, time_slot)` yields `{room_id, time_slot, instructor_id}`. Only `course_id` is non-prime.",
    misconceptionTags: ["prime-attribute-primary-only"],
    misconceptionRules: [
      {
        tag: "prime-attribute-primary-only",
        triggerPatterns: ["only primary key", "intersection", "just time_slot"],
        diagnosis:
          "Defined prime attributes using only the primary key (or intersection of keys) instead of the union of ALL candidate keys.",
        remediation:
          "Any attribute that participates in ANY candidate key of the relation is a prime attribute—this distinction becomes crucial when testing 3NF.",
      },
    ],
  },
  {
    id: "prac-db-fund-2",
    conceptId: "db-fundamentals",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "A DBA splits conceptual table `Faculty(id, name, salary, dept)` into `FacultyPublic(id, name, dept)` and `FacultyPayroll(id, salary)`, then creates a `CREATE VIEW Faculty AS ...` join so existing reporting queries keep running unchanged. What does this illustrate?",
    options: [
      "Logical data independence between the conceptual schema and external views",
      "Physical data independence between disk pages and the conceptual schema",
      "Instance mutation without schema modification",
      "Write-ahead logging durability",
    ],
    expectedAnswer:
      "Logical data independence between the conceptual schema and external views",
    acceptableKeywords: ["logical data independence", "external", "view", "conceptual"],
    explanation:
      "Splitting base tables alters the conceptual schema. Shielding external user applications from that conceptual restructuring via views demonstrates logical data independence.",
    misconceptionTags: ["physical-vs-logical-independence"],
  },
  {
    id: "prac-db-fund-3",
    conceptId: "db-fundamentals",
    difficulty: 3,
    type: "short_answer",
    prompt:
      "Distinguish a database SCHEMA from a database INSTANCE: if you execute `DELETE FROM Orders WHERE status = 'CANCELLED'`, which of the two changes?",
    expectedAnswer: "Database instance",
    acceptableAnswers: ["instance", "database instance", "the instance", "database state"],
    acceptableKeywords: ["instance", "state", "rows", "schema unchanged"],
    explanation:
      "`DELETE` modifies the rows stored at this moment in time—the database instance (or state)—while leaving the structural definition of tables, columns, and types (the database schema) completely unchanged.",
    misconceptionTags: ["schema-vs-instance-confusion"],
  },
  {
    id: "prac-tables-2",
    conceptId: "tables-rows-columns",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "Table `Sensors(sensor_id, reading)` has 5 rows with `reading` values: `10, 20, NULL, 30, NULL`. What values do `COUNT(*)` and `COUNT(reading)` return respectively?",
    options: [
      "COUNT(*) = 5, COUNT(reading) = 3",
      "COUNT(*) = 5, COUNT(reading) = 5",
      "COUNT(*) = 3, COUNT(reading) = 3",
      "COUNT(*) = 5, COUNT(reading) = NULL",
    ],
    expectedAnswer: "COUNT(*) = 5, COUNT(reading) = 3",
    acceptableKeywords: ["5", "3", "ignores null", "non-null"],
    explanation:
      "`COUNT(*)` counts total tuples in the group regardless of NULLs (5), whereas `COUNT(column)` counts only rows where `column IS NOT NULL` (3).",
    misconceptionTags: ["count-star-vs-count-column-null"],
    sampleDictatedMisconception: {
      label: "Test Wispr Flow misconception: COUNT(col) with NULLs",
      answer: "COUNT(*) = 5, COUNT(reading) = 5",
      reasoning:
        "So there are five rows in the Sensors table, um, two of them have NULL in reading, and I think COUNT(reading) just counts how many rows exist for that column so both COUNT star and COUNT reading should return 5.",
    },
    misconceptionRules: [
      {
        tag: "count-star-vs-count-column-null",
        triggerPatterns: ["both return 5", "counts how many rows exist for that column", "includes null"],
        wrongOptionMatch: "COUNT(*) = 5, COUNT(reading) = 5",
        diagnosis:
          "Assumed `COUNT(column)` counts NULL entries like `COUNT(*)`, whereas SQL aggregate functions (except `COUNT(*)`) ignore NULLs.",
        remediation:
          "Remember: `COUNT(*)` counts rows, while `COUNT(expr)` counts non-NULL values of `expr` (`10, 20, 30` → 3).",
      },
    ],
  },
  {
    id: "prac-tables-3",
    conceptId: "tables-rows-columns",
    difficulty: 3,
    type: "short_answer",
    prompt:
      "If relation `R` has 6 attributes (columns) and 140 tuples (rows), and you project `R` onto 4 attributes where all resulting tuples remain distinct, what are the DEGREE and CARDINALITY of the result?",
    expectedAnswer: "Degree 4, Cardinality 140",
    acceptableAnswers: [
      "degree 4, cardinality 140",
      "4 and 140",
      "degree = 4, cardinality = 140",
      "degree: 4, cardinality: 140",
    ],
    acceptableKeywords: ["4", "140", "degree", "cardinality"],
    explanation:
      "Degree (or arity) is the number of attributes/columns (4 after projection), while cardinality is the number of distinct tuples/rows (140).",
    misconceptionTags: ["degree-vs-cardinality-swap"],
    misconceptionRules: [
      {
        tag: "degree-vs-cardinality-swap",
        triggerPatterns: ["degree 140", "degree is 140", "cardinality 4", "cardinality is 4"],
        diagnosis: "Swapped the definitions of relational degree (columns) and cardinality (rows).",
        remediation:
          "Mnemonic: Cardinality = Count of rows (tuples); Degree = Dimensions / columns (attributes).",
      },
    ],
  },
  {
    id: "prac-pk-2",
    conceptId: "primary-keys",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "You are designing a `Citizens` table. Why do database architects often prefer an immutable surrogate key `citizen_uuid` as the Primary Key while keeping a `UNIQUE NOT NULL` constraint on `national_tax_id`, rather than using `phone_number` or `email` as Primary Key?",
    options: [
      "Primary keys referenced by foreign keys should be stable and immutable; mutable attributes like email/phone force cascading updates across child tables",
      "SQL forbids `VARCHAR` columns from ever serving as a Primary Key",
      "A table with a surrogate Primary Key cannot have any other `UNIQUE` constraints",
      "Surrogate keys automatically eliminate the need for foreign keys",
    ],
    expectedAnswer:
      "Primary keys referenced by foreign keys should be stable and immutable; mutable attributes like email/phone force cascading updates across child tables",
    acceptableKeywords: ["immutable", "stable", "foreign key", "cascade", "natural"],
    explanation:
      "While SQL allows `VARCHAR` primary keys, natural attributes like email or phone change over time. Updating a primary key requires updating every referencing foreign key row across the database, whereas a stable surrogate key + `UNIQUE` business constraint gives both stability and domain uniqueness.",
    misconceptionTags: ["pk-stability-vs-uniqueness"],
  },
  {
    id: "prac-pk-3",
    conceptId: "primary-keys",
    difficulty: 3,
    type: "multiple_choice",
    prompt:
      "In PostgreSQL/ANSI SQL, suppose table `Coupons(code VARCHAR(20) UNIQUE)` uses `UNIQUE` WITHOUT `NOT NULL`, whereas `Vouchers(code VARCHAR(20) PRIMARY KEY)` uses `PRIMARY KEY`. What behavioral difference occurs with `NULL`?",
    options: [
      "`PRIMARY KEY` implicitly enforces `NOT NULL`, whereas standard `UNIQUE` permits `NULL` entries because `NULL != NULL` is UNKNOWN",
      "Both reject `NULL` identically in ANSI SQL",
      "`PRIMARY KEY` allows exactly one `NULL` row, whereas `UNIQUE` allows none",
      "`UNIQUE` automatically indexes the column, whereas `PRIMARY KEY` never creates an index",
    ],
    expectedAnswer:
      "`PRIMARY KEY` implicitly enforces `NOT NULL`, whereas standard `UNIQUE` permits `NULL` entries because `NULL != NULL` is UNKNOWN",
    acceptableKeywords: ["not null", "unique", "entity integrity", "unknown"],
    explanation:
      "In ANSI SQL (and engines like PostgreSQL), `PRIMARY KEY` is strictly equivalent to `UNIQUE NOT NULL` (at most one per table). A standalone `UNIQUE` constraint without `NOT NULL` permits multiple `NULL` values because two `NULL`s are not considered equal.",
    misconceptionTags: ["unique-vs-primary-key-nulls"],
  },
  {
    id: "prac-fd-2",
    conceptId: "functional-dependencies",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Looking at a 4-row snapshot of `Course(course_id, instructor, room)`, you notice every row with `room = '101'` happens to have `instructor = 'Dr. Rao'`. Can you conclude the functional dependency `room → instructor` holds on the schema?",
    options: [
      "No—functional dependencies are semantic constraints over ALL legal instances, not coincidences in a single small snapshot; you can only DISPROVE an FD from an instance",
      "Yes—if every current row satisfies `room → instructor`, the FD automatically holds for the schema",
      "Yes, provided `room` has no NULL values in those 4 rows",
      "No, because only primary keys can appear on the left side of a functional dependency",
    ],
    expectedAnswer:
      "No—functional dependencies are semantic constraints over ALL legal instances, not coincidences in a single small snapshot; you can only DISPROVE an FD from an instance",
    acceptableKeywords: ["all legal instances", "disprove", "semantic", "snapshot"],
    explanation:
      "A single table snapshot can falsify an FD (if two rows have the same `room` but different `instructor`), because a counterexample violates it. However, passing on 4 rows could be coincidence—next semester another instructor may teach in room 101 at a different hour. FDs come from domain rules across all valid instances.",
    misconceptionTags: ["fd-from-single-instance-fallacy"],
    misconceptionRules: [
      {
        tag: "fd-from-single-instance-fallacy",
        triggerPatterns: ["current row satisfies", "holds in the table", "automatically holds"],
        wrongOptionMatch:
          "Yes—if every current row satisfies `room → instructor`, the FD automatically holds for the schema",
        diagnosis:
          "Inferred a schema-level functional dependency from accidental patterns in one finite table snapshot.",
        remediation:
          "Data instances can DISPROVE `X → Y` (via a counterexample pair of rows), never PROVE `X → Y` universally.",
      },
    ],
  },
  {
    id: "prac-fd-3",
    conceptId: "functional-dependencies",
    difficulty: 3,
    type: "multiple_choice",
    prompt:
      "Which of the following inference rules is UNSOUND (i.e., NOT a valid rule for functional dependencies)?",
    options: [
      "Splitting the determinant (Left-Hand Decomposition): from `AB → C`, infer `A → C` and `B → C`",
      "Splitting the dependent (Right-Hand Decomposition): from `A → BC`, infer `A → B` and `A → C`",
      "Augmentation: from `A → B`, infer `AC → BC`",
      "Pseudo-transitivity: from `A → B` and `BC → D`, infer `AC → D`",
    ],
    expectedAnswer:
      "Splitting the determinant (Left-Hand Decomposition): from `AB → C`, infer `A → C` and `B → C`",
    acceptableKeywords: ["left-hand", "splitting", "ab -> c", "together", "unsound"],
    explanation:
      "You can decompose the RIGHT-hand side (`X → YZ` implies `X → Y` and `X → Z`), NEVER the LEFT-hand side! For example, `(student_id, course_id) → grade` does NOT imply `student_id → grade` alone (a student earns different grades in different courses).",
    misconceptionTags: ["lhs-fd-splitting-fallacy"],
    sampleDictatedMisconception: {
      label: "Test Wispr Flow misconception: Splitting LHS vs RHS of FD",
      answer:
        "Splitting the dependent (Right-Hand Decomposition): from `A → BC`, infer `A → B` and `A → C`",
      reasoning:
        "Wait let me check Armstrong's axioms... if AB determines C then A and B determine C so maybe A determines C works, whereas A determines BC—can we split BC? Um I think splitting the right side A -> BC into A -> B and A -> C is invalid.",
    },
    misconceptionRules: [
      {
        tag: "lhs-fd-splitting-fallacy",
        triggerPatterns: ["ab determines c then a", "split left", "splitting the right side"],
        diagnosis:
          "Reversed the decomposition rule for functional dependencies: right-hand decomposition (`A → BC` ⇒ `A → B, A → C`) IS valid, whereas left-hand decomposition (`AB → C` ⇒ `A → C`) is invalid.",
        remediation:
          "Test with `(student_id, course_id) → grade`: knowing both gives one grade, but `student_id` alone does NOT determine a single grade!",
      },
    ],
  },
  {
    id: "prac-nf-2",
    conceptId: "normal-forms-1-2-3",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Relation `EmployeeDept(emp_id, emp_name, dept_id, dept_location)` has single-attribute primary key `emp_id` (no other candidate keys) and FDs `emp_id → emp_name, dept_id` and `dept_id → dept_location`. What is the highest normal form satisfied?",
    options: [
      "2NF (automatically in 2NF because the sole candidate key is a single attribute, but violates 3NF via `emp_id → dept_id → dept_location`)",
      "1NF (violates 2NF because `dept_location` depends on `dept_id`)",
      "3NF (no anomalies exist)",
      "BCNF",
    ],
    expectedAnswer:
      "2NF (automatically in 2NF because the sole candidate key is a single attribute, but violates 3NF via `emp_id → dept_id → dept_location`)",
    acceptableKeywords: ["single attribute", "2nf", "transitive", "dept_id", "3nf"],
    explanation:
      "A partial dependency requires an attribute to depend on a PROPER non-empty subset of a candidate key. A single-attribute key `{emp_id}` has no proper non-empty subset, so any 1NF relation whose every candidate key is a single attribute is automatically in 2NF! However, `dept_id → dept_location` is a non-key determining a non-prime attribute (transitive dependency), violating 3NF.",
    misconceptionTags: ["2nf-single-attribute-key-myth", "partial-vs-transitive-dependency"],
    misconceptionRules: [
      {
        tag: "2nf-single-attribute-key-myth",
        triggerPatterns: ["violates 2nf", "1nf"],
        wrongOptionMatch: "1NF (violates 2NF because `dept_location` depends on `dept_id`)",
        diagnosis:
          "Misclassified a transitive dependency (`emp_id → dept_id → dept_location`) as a 2NF partial dependency even though `emp_id` is a single-attribute key.",
        remediation:
          "Check key size first: if every candidate key has just 1 attribute, 2NF can NEVER be violated (no proper subset exists). Non-key → non-key dependencies violate 3NF.",
      },
    ],
  },
  {
    id: "prac-nf-3",
    conceptId: "normal-forms-1-2-3",
    difficulty: 3,
    type: "short_answer",
    prompt:
      "Why do we decompose `EmployeeDept(emp_id, dept_id, dept_location)` into `Emp(emp_id, dept_id)` and `Dept(dept_id, dept_location)` instead of keeping one table? Name ONE specific modification anomaly (insert, update, or delete) that occurs in the unnormalized table.",
    expectedAnswer: "Update, insertion, or deletion anomaly",
    acceptableAnswers: [
      "update anomaly",
      "deletion anomaly",
      "insertion anomaly",
      "insert anomaly",
      "delete anomaly",
    ],
    acceptableKeywords: ["anomaly", "redundant", "delete", "insert", "update", "dept_location"],
    explanation:
      "Keeping `dept_location` in `EmployeeDept` causes all three modification anomalies: (1) Update anomaly—moving a department requires updating every employee row in that department; (2) Insertion anomaly—cannot record a new department's location until at least one employee joins it; (3) Deletion anomaly—deleting the last employee in a department loses the department's location.",
    misconceptionTags: ["normalization-anomaly-purpose"],
  },
  {
    id: "prac-bcnf-2",
    conceptId: "bcnf",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "When decomposing relation `R(A, B, C)` into `R1(A, B)` and `R2(B, C)` to achieve BCNF, what condition guarantees a LOSSLESS-JOIN decomposition (no spurious tuples when joining `R1 ⋈ R2`)?",
    options: [
      "The common attribute `R1 ∩ R2 = {B}` must be a superkey of EITHER `R1` (i.e., `B → A`) OR `R2` (i.e., `B → C`)",
      "The common attribute `{B}` must be a superkey of BOTH `R1` and `R2` simultaneously",
      "`R1` and `R2` must have zero attributes in common",
      "Every functional dependency of `R` must have all its attributes in `R1` alone",
    ],
    expectedAnswer:
      "The common attribute `R1 ∩ R2 = {B}` must be a superkey of EITHER `R1` (i.e., `B → A`) OR `R2` (i.e., `B → C`)",
    acceptableKeywords: ["intersection", "common attribute", "either", "superkey", "spurious"],
    explanation:
      "By Heath's Theorem, binary decomposition `(R1, R2)` is lossless if and only if `(R1 ∩ R2) → R1` or `(R1 ∩ R2) → R2` holds in `F+`—meaning the shared column(s) form a superkey of at least ONE of the two decomposed tables.",
    misconceptionTags: ["lossless-join-both-vs-either-key"],
    misconceptionRules: [
      {
        tag: "lossless-join-both-vs-either-key",
        triggerPatterns: ["superkey of both", "both tables"],
        wrongOptionMatch:
          "The common attribute `{B}` must be a superkey of BOTH `R1` and `R2` simultaneously",
        diagnosis:
          "Over-constrained Heath's lossless-join test by requiring `R1 ∩ R2` to be a key of BOTH sub-relations rather than at least ONE (parent PK ↔ child FK).",
        remediation:
          "Think of standard PK-FK tables `Emp(emp_id, dept_id)` and `Dept(dept_id, loc)`: intersection `{dept_id}` is a key of `Dept` only, and joining them is completely lossless!",
      },
    ],
  },
  {
    id: "prac-bcnf-3",
    conceptId: "bcnf",
    difficulty: 3,
    type: "multiple_choice",
    prompt:
      "Compare 3NF and BCNF decompositions for an arbitrary relation schema `R` with functional dependencies `F`. Which guarantee is ALWAYS achievable in 3NF, yet SOMETIMES impossible to preserve simultaneously with BCNF?",
    options: [
      "Dependency preservation (checking every FD within individual tables without joins)",
      "Lossless-join decomposition (avoiding spurious rows)",
      "Atomic attribute domains",
      "Eliminating partial dependencies on candidate keys",
    ],
    expectedAnswer:
      "Dependency preservation (checking every FD within individual tables without joins)",
    acceptableKeywords: ["dependency preservation", "lossless", "3nf", "bcnf"],
    explanation:
      "Every relation can ALWAYS be decomposed into BCNF with the lossless-join property, and ALWAYS into 3NF with BOTH lossless-join AND dependency preservation. However, some schemas (such as `AB → C, C → B`) cannot achieve BCNF without splitting an FD across two tables.",
    misconceptionTags: ["bcnf-lossless-vs-dep-preservation"],
  },
  {
    id: "prac-sql-2",
    conceptId: "sql-queries",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Why does `SELECT dept_id, AVG(salary) AS avg_sal FROM Employees WHERE avg_sal > 90000 GROUP BY dept_id;` fail in standard SQL?",
    options: [
      "Both because `WHERE` executes before `GROUP BY`/`SELECT` (so column alias `avg_sal` and aggregates don't exist yet); use `HAVING AVG(salary) > 90000`",
      "Because `AVG` can only be used without `GROUP BY`",
      "Because `AS avg_sal` is invalid syntax in `SELECT`",
      "Because `GROUP BY` must be written before `FROM`",
    ],
    expectedAnswer:
      "Both because `WHERE` executes before `GROUP BY`/`SELECT` (so column alias `avg_sal` and aggregates don't exist yet); use `HAVING AVG(salary) > 90000`",
    acceptableKeywords: ["logical order", "where", "group by", "having", "alias"],
    explanation:
      "SQL's logical evaluation order is `FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY`. When `WHERE` runs, neither the groups (`AVG(salary)`) nor the `SELECT` alias (`avg_sal`) have been computed yet.",
    misconceptionTags: ["where-vs-having-execution-order", "sql-alias-in-where"],
  },
  {
    id: "prac-sql-3",
    conceptId: "sql-queries",
    difficulty: 3,
    type: "multiple_choice",
    prompt:
      "Table `Customers(id)` has rows `1, 2, 3`. Subquery table `Blacklist(cust_id)` has rows `2, NULL`. How many rows does `SELECT id FROM Customers WHERE id NOT IN (SELECT cust_id FROM Blacklist);` return?",
    options: [
      "0 rows—because `id != 2 AND id != NULL` evaluates to `TRUE AND UNKNOWN = UNKNOWN` for IDs 1 and 3",
      "2 rows (`1` and `3`), ignoring the NULL in `Blacklist`",
      "3 rows (`1`, `2`, `3`)",
      "1 row (`2`)",
    ],
    expectedAnswer:
      "0 rows—because `id != 2 AND id != NULL` evaluates to `TRUE AND UNKNOWN = UNKNOWN` for IDs 1 and 3",
    acceptableKeywords: ["0", "not in", "unknown", "not exists", "null"],
    explanation:
      "This is one of the most famous SQL exam and production bugs! `x NOT IN (2, NULL)` expands to `x <> 2 AND x <> NULL`. For `x = 1`, `TRUE AND UNKNOWN` evaluates to `UNKNOWN`, which `WHERE` filters out—returning 0 rows! Always prefer `NOT EXISTS` or filter `WHERE cust_id IS NOT NULL` inside `NOT IN`.",
    misconceptionTags: ["not-in-with-null-trap"],
  },
  {
    id: "prac-joins-2",
    conceptId: "joins",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Table `A` has 4 rows and Table `B` has 5 rows. One row in `A` matches 2 rows in `B`, another row in `A` matches 1 row in `B`, and the remaining 2 rows in `A` match 0 rows in `B`. How many rows do `A INNER JOIN B` and `A LEFT OUTER JOIN B` return respectively?",
    options: [
      "INNER JOIN = 3 rows, LEFT OUTER JOIN = 5 rows",
      "INNER JOIN = 2 rows, LEFT OUTER JOIN = 4 rows",
      "INNER JOIN = 3 rows, LEFT OUTER JOIN = 4 rows",
      "INNER JOIN = 20 rows, LEFT OUTER JOIN = 20 rows",
    ],
    expectedAnswer: "INNER JOIN = 3 rows, LEFT OUTER JOIN = 5 rows",
    acceptableKeywords: ["3", "5", "unmatched", "null-padded"],
    explanation:
      "`INNER JOIN` emits every matching pair: `2 + 1 = 3` rows. `LEFT OUTER JOIN` emits those 3 matched pairs PLUS 1 NULL-extended row for each of the 2 unmatched rows in `A`: `3 + 2 = 5` rows (note a `LEFT JOIN` can have MORE rows than the left table when 1-to-many matches occur!).",
    misconceptionTags: ["left-join-row-count-cap-myth"],
    misconceptionRules: [
      {
        tag: "left-join-row-count-cap-myth",
        triggerPatterns: ["always equals 4", "same number of rows as left", "cannot exceed 4"],
        wrongOptionMatch: "INNER JOIN = 3 rows, LEFT OUTER JOIN = 4 rows",
        diagnosis:
          "Assumed `A LEFT JOIN B` always returns at most `|A|` rows, forgetting that a left row matching 2 right rows produces 2 output rows.",
        remediation:
          "`LEFT JOIN` guarantees AT LEAST 1 row per left row (never fewer than `INNER JOIN`), and duplicates a left row whenever it matches multiple rows in `B` (`2 + 1 + 1 + 1 = 5`).",
      },
    ],
  },
  {
    id: "prac-joins-3",
    conceptId: "joins",
    difficulty: 3,
    type: "short_answer",
    prompt:
      "In `Employees(emp_id, name, manager_id)` where `manager_id` references `Employees(emp_id)`, what SQL join technique is required to return each employee's name alongside their manager's name in a single row (including the CEO whose `manager_id IS NULL`)?",
    expectedAnswer: "LEFT JOIN self-join on Employees",
    acceptableAnswers: [
      "left self join",
      "self left join",
      "left outer self-join",
      "self-join with left join",
      "left join self-join",
      "left join on the same table",
    ],
    acceptableKeywords: ["self", "left", "alias"],
    explanation:
      "You alias `Employees` twice (`FROM Employees e LEFT JOIN Employees m ON e.manager_id = m.emp_id`)—a LEFT OUTER self-join. Using `INNER JOIN` on the self-join would accidentally drop the CEO whose `manager_id` is NULL!",
    misconceptionTags: ["self-join-inner-drops-root"],
  },
  {
    id: "prac-acid-2",
    conceptId: "transactions-acid",
    difficulty: 1,
    type: "multiple_choice",
    prompt:
      "Transaction T1 updates a product's price from $100 to $10, Transaction T2 reads $10, and then T1 rolls back (aborts) so the real price was never $10. What concurrency anomaly did T2 just suffer?",
    options: [
      "Dirty read (reading uncommitted data written by an eventually aborted transaction)",
      "Non-repeatable read (reading two different committed values in the same transaction)",
      "Phantom read (new rows inserted matching a range predicate)",
      "Write-ahead log corruption",
    ],
    expectedAnswer:
      "Dirty read (reading uncommitted data written by an eventually aborted transaction)",
    acceptableKeywords: ["dirty read", "uncommitted", "read committed"],
    explanation:
      "Reading uncommitted changes from another transaction is a Dirty Read, prevented by upgrading from `READ UNCOMMITTED` to at least `READ COMMITTED`.",
    misconceptionTags: ["dirty-vs-nonrepeatable-vs-phantom"],
  },
  {
    id: "prac-acid-3",
    conceptId: "transactions-acid",
    difficulty: 3,
    type: "multiple_choice",
    prompt:
      "A transaction commits and returns 'Payment Successful' to the user. Two milliseconds later, power fails before dirty buffer-pool pages are flushed to the data files on disk. How does a DBMS guarantee Durability without forcing random data-page disk writes on every commit?",
    options: [
      "Write-Ahead Logging (WAL): sequential REDO log records up to commit are flushed to non-volatile storage before acknowledging commit, allowing recovery to replay them",
      "Two-Phase Locking (2PL) holds exclusive locks in RAM across power failures",
      "Foreign key constraints reconstruct committed rows automatically",
      "Isolation level `SERIALIZABLE` writes directly to CPU cache",
    ],
    expectedAnswer:
      "Write-Ahead Logging (WAL): sequential REDO log records up to commit are flushed to non-volatile storage before acknowledging commit, allowing recovery to replay them",
    acceptableKeywords: ["wal", "write-ahead", "redo", "sequential", "flush"],
    explanation:
      "Under Write-Ahead Logging (ARIES), sequential log records containing REDO information are flushed to durable storage at commit time (`FORCE-LOG-AT-COMMIT`), which is fast because log appends are sequential. After a crash, the recovery manager replays REDO records to restore committed updates that hadn't reached data pages yet.",
    misconceptionTags: ["wal-redo-vs-undo-mechanics"],
  },
  {
    id: "prac-fd-4",
    conceptId: "functional-dependencies",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "Relation `R(A, B, C, D, E)` has FDs: `AB → C`, `C → D`, and `D → B`. Notice attribute `E` never appears on the right-hand side of any non-trivial FD. What can you immediately deduce about `E`?",
    options: [
      "`E` MUST belong to every candidate key of `R` (and the candidate keys are `ABE`, `ACE`, and `ADE`)",
      "`E` cannot belong to any candidate key of `R`",
      "`E` alone is the primary key of `R`",
      "`R` has no candidate keys because `E` has no dependencies",
    ],
    expectedAnswer:
      "`E` MUST belong to every candidate key of `R` (and the candidate keys are `ABE`, `ACE`, and `ADE`)",
    acceptableKeywords: ["every candidate key", "rhs", "abe", "ace", "ade"],
    explanation:
      "Any attribute that never appears on the RHS of a non-trivial FD can never be derived from other attributes in closure `X+` unless it is already in `X`! Testing closures: `{ABE}+ = ABCDE`, `{ACE}+ = ACDBE`, and `{ADE}+ = ADBCE`, all minimal—giving 3 candidate keys.",
    misconceptionTags: ["missing-rhs-essential-attribute"],
  },
  {
    id: "prac-nf-4",
    conceptId: "normal-forms-1-2-3",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "A developer stores comma-separated phone numbers `'555-0101, 555-0199'` inside a single `VARCHAR` column `phones` of `Contacts(contact_id, name, phones)` and regularly queries contacts by individual area code. Which normal form does this design violate first, and why?",
    options: [
      "1NF—storing repeating multi-valued lists inside one cell violates attribute atomicity and breaks indexing/referential integrity",
      "BCNF only—it satisfies 1NF, 2NF, and 3NF",
      "3NF only—because `phones` transitively depends on `name`",
      "2NF only—because `contact_id` is a partial dependency",
    ],
    expectedAnswer:
      "1NF—storing repeating multi-valued lists inside one cell violates attribute atomicity and breaks indexing/referential integrity",
    acceptableKeywords: ["1nf", "atomic", "multi-valued", "repeating"],
    explanation:
      "First Normal Form (1NF) requires every attribute domain to contain atomic (indivisible) values rather than embedded multi-valued lists or repeating groups. Moving phones into `ContactPhones(contact_id, phone_number)` restores 1NF.",
    misconceptionTags: ["1nf-multivalued-string-packing"],
  },
  {
    id: "prac-joins-4",
    conceptId: "joins",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "You want to find all products in `Products p` that have NEVER been ordered in `OrderItems oi(order_id, product_id)` (even if `oi.product_id` contains some NULL rows). Which anti-join pattern is safe against NULLs?",
    options: [
      "`SELECT p.id FROM Products p LEFT JOIN OrderItems oi ON p.id = oi.product_id WHERE oi.product_id IS NULL` (or `NOT EXISTS`)",
      "`SELECT p.id FROM Products p WHERE p.id NOT IN (SELECT product_id FROM OrderItems)`",
      "`SELECT p.id FROM Products p INNER JOIN OrderItems oi ON p.id != oi.product_id`",
      "`SELECT p.id FROM Products p CROSS JOIN OrderItems oi`",
    ],
    expectedAnswer:
      "`SELECT p.id FROM Products p LEFT JOIN OrderItems oi ON p.id = oi.product_id WHERE oi.product_id IS NULL` (or `NOT EXISTS`)",
    acceptableKeywords: ["left join", "is null", "not exists", "anti-join"],
    explanation:
      "A `LEFT JOIN ... WHERE right_pk IS NULL` (or `NOT EXISTS`) safely returns unmatched left rows even when `OrderItems.product_id` contains NULLs, whereas `NOT IN` collapses to 0 rows whenever the subquery emits a single NULL.",
    misconceptionTags: ["anti-join-vs-not-in-null"],
  },
  {
    id: "prac-acid-4",
    conceptId: "transactions-acid",
    difficulty: 2,
    type: "multiple_choice",
    prompt:
      "Under ANSI SQL `REPEATABLE READ`, Transaction T1 runs `SELECT COUNT(*) FROM Tickets WHERE flight_id = 99` twice. Between the two reads, T2 inserts a brand-new row with `flight_id = 99` and commits. According to the ANSI anomaly specification, what anomaly can still occur under pure lock-based `REPEATABLE READ` (requiring `SERIALIZABLE` to prevent in the ANSI model)?",
    options: [
      "Phantom read—existing rows locked by T1 don't change, so existing rows are repeatable, but newly inserted rows matching the `WHERE` predicate appear",
      "Dirty read—T1 sees T2's uncommitted row",
      "Lost update on T1's primary key",
      "Deadlock starvation",
    ],
    expectedAnswer:
      "Phantom read—existing rows locked by T1 don't change, so existing rows are repeatable, but newly inserted rows matching the `WHERE` predicate appear",
    acceptableKeywords: ["phantom", "new rows", "range", "predicate", "serializable"],
    explanation:
      "Row-level read locks prevent existing rows from changing (preventing non-repeatable reads), but without range/predicate locks (or MVCC snapshot isolation as in PostgreSQL), newly inserted rows matching the search condition appear on re-execution—known as a Phantom Read.",
    misconceptionTags: ["dirty-vs-nonrepeatable-vs-phantom"],
  },
];

export const DIAGNOSTIC_QUESTIONS: Question[] = QUESTION_BANK.filter(
  (q) => q.isDiagnostic
);

export function getQuestionsByConcept(conceptId: string): Question[] {
  return QUESTION_BANK.filter((q) => q.conceptId === conceptId);
}
