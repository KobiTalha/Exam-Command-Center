SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS performance;
DROP TABLE IF EXISTS study_plan;
DROP TABLE IF EXISTS flashcards;
DROP TABLE IF EXISTS courses;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(20) NOT NULL,
    type ENUM('core', 'lab', 'elective') NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL
);

CREATE TABLE flashcards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL DEFAULT 'medium',
    next_review DATE DEFAULT NULL,
    last_reviewed DATE DEFAULT NULL,
    INDEX idx_flashcards_course_id (course_id),
    INDEX idx_flashcards_next_review (next_review),
    CONSTRAINT fk_flashcards_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE study_plan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    topic VARCHAR(255) NOT NULL,
    study_date DATE NOT NULL,
    duration INT NOT NULL,
    status ENUM('pending', 'in-progress', 'completed') NOT NULL DEFAULT 'pending',
    INDEX idx_study_plan_course_id (course_id),
    INDEX idx_study_plan_study_date (study_date),
    CONSTRAINT fk_study_plan_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE performance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL UNIQUE,
    accuracy DECIMAL(5,2) NOT NULL,
    weak_score DECIMAL(5,2) NOT NULL,
    CONSTRAINT fk_performance_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(60) NOT NULL,
    product_type ENUM('physical', 'digital') NOT NULL DEFAULT 'physical',
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    featured TINYINT(1) NOT NULL DEFAULT 0,
    badge VARCHAR(60) DEFAULT '',
    image_path VARCHAR(255) DEFAULT ''
);

CREATE TABLE cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 1,
    CONSTRAINT fk_cart_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(120) NOT NULL,
    customer_email VARCHAR(120) NOT NULL,
    customer_phone VARCHAR(40) DEFAULT '',
    campus VARCHAR(80) DEFAULT 'AIUB Campus',
    delivery_note TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    status ENUM('placed', 'packed', 'completed', 'cancelled') NOT NULL DEFAULT 'placed',
    order_date DATETIME NOT NULL
);

CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO courses (code, name, category, type, difficulty) VALUES
('CSC 1102', 'Introduction to Programming Language', 'CSC', 'core', 'hard'),
('CSC 1103', 'Introduction to Programming Language Lab', 'CSC', 'lab', 'medium'),
('CSC 1204', 'Discrete Mathematics', 'CSC', 'core', 'medium'),
('CSC 1205', 'Object Oriented Programming 1', 'CSC', 'core', 'medium'),
('CSC 2106', 'Data Structure', 'CSC', 'core', 'hard'),
('CSC 2107', 'Data Structure Lab', 'CSC', 'lab', 'easy'),
('CSC 2108', 'Introduction to Database', 'CSC', 'core', 'medium'),
('CSC 2209', 'Object Oriented Analysis and Design', 'CSC', 'core', 'medium'),
('CSC 2210', 'Object Oriented Programming 2', 'CSC', 'core', 'hard'),
('CSC 2211', 'Algorithms', 'CSC', 'core', 'easy'),
('CSC 3112', 'Software Engineering', 'CSC', 'core', 'medium'),
('CSC 3113', 'Theory of Computation', 'CSC', 'core', 'medium'),
('CSC 3214', 'Operating Systems', 'CSC', 'core', 'hard'),
('CSC 3215', 'Web Technologies', 'CSC', 'core', 'easy'),
('CSC 3216', 'Compiler Design', 'CSC', 'core', 'medium'),
('CSC 3217', 'Artificial Intelligence and Expert System', 'CSC', 'core', 'medium'),
('CSC 4118', 'Computer Graphics', 'CSC', 'core', 'hard'),
('EEE 2108', 'Introduction to Electrical Circuits', 'EEE', 'core', 'easy'),
('EEE 2109', 'Introduction to Electrical Circuits Lab', 'EEE', 'lab', 'medium'),
('EEE 2103', 'Electronic Devices', 'EEE', 'core', 'medium'),
('EEE 2104', 'Electronic Devices Lab', 'EEE', 'lab', 'easy'),
('EEE 3101', 'Digital Logic and Circuits', 'EEE', 'core', 'easy'),
('EEE 3101L', 'Digital Logic Lab', 'EEE', 'lab', 'medium'),
('EEE 2216', 'Engineering Ethics', 'EEE', 'core', 'medium'),
('COE 3101', 'Data Communication', 'COE', 'core', 'hard'),
('COE 3102', 'Microprocessor and Embedded Systems', 'COE', 'core', 'easy'),
('COE 3203', 'Computer Organization & Architecture', 'COE', 'core', 'medium'),
('COE 3204', 'Computer Networks', 'COE', 'core', 'medium'),
('MAT 1102', 'Differential Calculus', 'MAT', 'core', 'hard'),
('MAT 1205', 'Integral Calculus', 'MAT', 'core', 'easy'),
('MAT 2101', 'Complex Variables', 'MAT', 'core', 'medium'),
('MAT 2202', 'Matrices and Fourier', 'MAT', 'core', 'medium'),
('MAT 3103', 'Probability and Statistics', 'MAT', 'core', 'hard'),
('MAT 3101', 'Numerical Methods', 'MAT', 'core', 'easy'),
('PHY 1101', 'Physics 1', 'PHY', 'core', 'medium'),
('PHY 1102', 'Physics 1 Lab', 'PHY', 'lab', 'easy'),
('PHY 1203', 'Physics 2', 'PHY', 'core', 'hard'),
('PHY 1204', 'Physics 2 Lab', 'PHY', 'lab', 'medium'),
('ENG 1101', 'English Speaking', 'ENG', 'core', 'medium'),
('ENG 1202', 'English Writing', 'ENG', 'core', 'medium'),
('ENG 2103', 'Business Communication', 'ENG', 'core', 'hard'),
('BBA 1102', 'Accounting', 'BBA', 'core', 'easy'),
('ECO 3150', 'Economics', 'ECO', 'core', 'medium'),
('MGT 3202', 'Engineering Management', 'MGT', 'core', 'medium'),
('BAS 2101', 'Bangladesh Studies', 'BAS', 'core', 'hard'),
('CSC 4197', 'Research Methodology', 'CSC', 'core', 'easy'),
('CSC 4298', 'Thesis', 'CSC', 'core', 'medium'),
('CSC 4299', 'Internship', 'CSC', 'core', 'medium'),
('CSC 4232', 'Machine Learning', 'CSC', 'elective', 'hard'),
('CSC 4233', 'NLP', 'CSC', 'elective', 'medium'),
('CSC 4254', 'Computer Vision', 'CSC', 'elective', 'medium'),
('CSC 4180', 'Data Science', 'CSC', 'elective', 'hard'),
('CSC 4285', 'Data Mining', 'CSC', 'elective', 'medium'),
('CSC 4272', 'Mobile App Development', 'CSC', 'elective', 'medium'),
('CSC 4262', 'Python', 'CSC', 'elective', 'hard'),
('CSC 4263', 'Java', 'CSC', 'elective', 'medium'),
('CSC 4264', '.NET', 'CSC', 'elective', 'medium'),
('COE 4252', 'Network Security', 'COE', 'elective', 'hard'),
('COE 4255', 'Robotics', 'COE', 'elective', 'medium');

INSERT INTO performance (course_id, accuracy, weak_score)
SELECT
    id,
    CASE difficulty
        WHEN 'hard' THEN 58 + MOD(id * 7, 18)
        WHEN 'medium' THEN 68 + MOD(id * 5, 17)
        ELSE 82 + MOD(id * 3, 12)
    END AS accuracy,
    CASE
        WHEN type = 'elective' THEN 48 + MOD(id * 4, 25)
        WHEN difficulty = 'hard' THEN 72 + MOD(id * 6, 18)
        WHEN difficulty = 'medium' THEN 44 + MOD(id * 5, 20)
        ELSE 22 + MOD(id * 3, 18)
    END AS weak_score
FROM courses;

INSERT INTO study_plan (course_id, topic, study_date, duration, status)
WITH RECURSIVE
day_offsets AS (
    SELECT 0 AS day_offset
    UNION ALL
    SELECT day_offset + 1 FROM day_offsets WHERE day_offset < 6
),
task_slots AS (
    SELECT 1 AS slot_index
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 4
),
weighted_courses AS (
    SELECT c.id, c.name, c.type, c.difficulty, p.weak_score
    FROM courses c
    INNER JOIN performance p ON p.course_id = c.id
    UNION ALL
    SELECT c.id, c.name, c.type, c.difficulty, p.weak_score
    FROM courses c
    INNER JOIN performance p ON p.course_id = c.id
    WHERE c.type = 'core'
    UNION ALL
    SELECT c.id, c.name, c.type, c.difficulty, p.weak_score
    FROM courses c
    INNER JOIN performance p ON p.course_id = c.id
    WHERE p.weak_score > 70
),
course_pool AS (
    SELECT
        ROW_NUMBER() OVER (
            ORDER BY weak_score DESC, FIELD(type, 'core', 'lab', 'elective'), FIELD(difficulty, 'hard', 'medium', 'easy'), id
        ) AS seq,
        id,
        name,
        type,
        difficulty,
        weak_score
    FROM weighted_courses
)
SELECT
    cp.id,
    CONCAT(
        CASE ts.slot_index
            WHEN 1 THEN 'AI priority review'
            WHEN 2 THEN 'Problem-solving sprint'
            WHEN 3 THEN 'Active recall deck'
            ELSE 'Revision checkpoint'
        END,
        ' - ',
        cp.name
    ) AS topic,
    DATE_ADD(CURDATE(), INTERVAL d.day_offset DAY) AS study_date,
    CASE
        WHEN ts.slot_index = 2 AND cp.weak_score > 70 THEN 150
        WHEN cp.type = 'core' AND cp.weak_score > 70 THEN 120
        WHEN cp.type = 'core' THEN 95
        WHEN cp.type = 'elective' THEN 75
        ELSE 80
    END AS duration,
    CASE
        WHEN d.day_offset = 0 AND ts.slot_index = 1 THEN 'in-progress'
        ELSE 'pending'
    END AS status
FROM day_offsets d
INNER JOIN task_slots ts
INNER JOIN course_pool cp ON cp.seq = ((d.day_offset * 4 + ts.slot_index - 1) MOD (SELECT COUNT(*) FROM course_pool)) + 1;

INSERT INTO products (sku, name, description, category, product_type, price, stock, featured, badge, image_path) VALUES
('AIUB-NOTES-OS', 'AIUB Semester Command Notes Pack', 'A curated digital bundle with revision maps, planner templates, and quick-reference notes for major core courses.', 'Digital Bundles', 'digital', 799.00, 999, 1, 'Best Seller', 'resources/hero-study.jpg'),
('AIUB-FLASH-DECK', 'Flashcard Mega Deck Export', 'A printable and mobile-friendly export pack that mirrors the Student OS flashcard strategy for rapid revision.', 'Digital Bundles', 'digital', 499.00, 999, 1, 'Exam Week', 'resources/focus-bg.jpg'),
('AIUB-WHITEBOARD', 'Desk Planning Whiteboard', 'A weekly wipe-clean planning board for study sessions, deadlines, and high-priority checkpoints.', 'Desk Setup', 'physical', 950.00, 18, 1, 'Focus Gear', 'resources/subject-math.jpg'),
('AIUB-HOODIE', 'AIUB Study Mode Hoodie', 'Comfort-first campus hoodie built for long lab sessions, night study blocks, and presentation days.', 'Campus Wear', 'physical', 1450.00, 14, 0, 'Campus Pick', 'resources/subject-science.jpg'),
('AIUB-PENS', 'Color Code Revision Pen Set', 'Four smooth pens tuned for formulas, diagrams, annotations, and deadline callouts.', 'Stationery', 'physical', 320.00, 42, 0, 'Budget Pick', 'resources/subject-literature.jpg'),
('AIUB-TOTE', 'Laptop + Notebook Carry Tote', 'Minimal study tote sized for notebooks, chargers, and one-day campus runs.', 'Campus Wear', 'physical', 890.00, 20, 0, 'New Drop', 'resources/achievement-streak.png'),
('AIUB-CHEATSHEET', 'Engineering Formula Sheet Bundle', 'A digital pack of carefully formatted formula sheets for MAT, PHY, EEE, and COE revision blocks.', 'Digital Bundles', 'digital', 650.00, 999, 1, 'Hot Download', 'resources/focus-bg.jpg'),
('AIUB-TIMER', 'Pomodoro Focus Timer Cube', 'A compact desk timer to keep revision sprints disciplined and break cycles intentional.', 'Desk Setup', 'physical', 780.00, 25, 0, 'Focus Gear', 'resources/hero-study.jpg');

INSERT INTO flashcards (course_id, question, answer, difficulty, next_review, last_reviewed)
WITH RECURSIVE
concept_slots AS (
    SELECT 1 AS slot
    UNION ALL
    SELECT slot + 1 FROM concept_slots WHERE slot < 25
),
card_modes AS (
    SELECT 1 AS mode_id
    UNION ALL
    SELECT 2
    UNION ALL
    SELECT 3
    UNION ALL
    SELECT 4
),
course_context AS (
    SELECT
        c.id,
        c.code,
        c.name,
        c.category,
        c.type,
        c.difficulty,
        CASE c.category
            WHEN 'CSC' THEN 'computing and software systems'
            WHEN 'EEE' THEN 'electrical and electronic engineering'
            WHEN 'COE' THEN 'computer engineering systems'
            WHEN 'MAT' THEN 'mathematical reasoning'
            WHEN 'PHY' THEN 'physical science'
            WHEN 'ENG' THEN 'professional communication'
            WHEN 'BBA' THEN 'business accounting'
            WHEN 'ECO' THEN 'economic analysis'
            WHEN 'MGT' THEN 'engineering management'
            ELSE 'interdisciplinary study'
        END AS discipline_label
    FROM courses c
)
SELECT
    cc.id AS course_id,
    CASE cm.mode_id
        WHEN 1 THEN CONCAT(
            'Definition ', LPAD(cs.slot, 2, '0'), ': In ', cc.code, ' ',
            cc.name, ', define ',
            ELT(
                cs.slot,
                'the fundamental principle',
                'the core terminology set',
                'the standard workflow',
                'the role of major components',
                'the input and output expectation',
                'the main formula or rule',
                'the representation format',
                'the design trade-off',
                'the debugging checklist',
                'the performance concern',
                'the safety or security concern',
                'the abstraction boundary',
                'the ordered algorithmic steps',
                'the common edge case',
                'the real-world application',
                'the comparison point',
                'the error handling method',
                'the optimisation strategy',
                'the practical lab scenario',
                'the result interpretation rule',
                'the evaluation metric',
                'the quality assurance checkpoint',
                'the integration touchpoint',
                'the revision summary anchor',
                'the exam-style challenge pattern'
            ),
            '.'
        )
        WHEN 2 THEN CONCAT(
            'Theory ', LPAD(cs.slot, 2, '0'), ': Explain how ',
            ELT(
                cs.slot,
                'foundational ideas',
                'notation choices',
                'workflow order',
                'component interactions',
                'input assumptions',
                'formal rules',
                'data representation',
                'trade-offs',
                'troubleshooting logic',
                'performance thinking',
                'safe practice',
                'abstractions',
                'step sequencing',
                'edge-case handling',
                'applications',
                'comparisons',
                'error recovery',
                'optimisation',
                'lab interpretation',
                'result analysis',
                'metrics',
                'quality checks',
                'integration',
                'revision strategy',
                'exam tactics'
            ),
            ' appear inside ', cc.name, '.'
        )
        WHEN 3 THEN CONCAT(
            'MCQ ', LPAD(cs.slot, 2, '0'), ': Which option best describes ',
            ELT(
                cs.slot,
                'the main principle',
                'course terminology',
                'the workflow step',
                'component behaviour',
                'input assumptions',
                'the main rule',
                'representation format',
                'trade-offs',
                'debugging logic',
                'performance focus',
                'safety practice',
                'abstraction use',
                'process order',
                'edge-case handling',
                'applied use',
                'comparison logic',
                'error handling',
                'optimisation',
                'lab execution',
                'result interpretation',
                'evaluation metric',
                'quality check',
                'integration need',
                'revision summary',
                'exam strategy'
            ),
            ' in ', cc.code, '?'
        )
        ELSE CONCAT(
            'Problem Solving ', LPAD(cs.slot, 2, '0'), ': Work through a short ',
            cc.name,
            ' scenario that demonstrates ',
            ELT(
                cs.slot,
                'concept recall',
                'terminology use',
                'workflow planning',
                'component selection',
                'input analysis',
                'rule application',
                'representation choice',
                'design trade-off judgement',
                'debugging decisions',
                'performance analysis',
                'safe execution',
                'abstraction mapping',
                'algorithm sequencing',
                'edge-case testing',
                'application planning',
                'comparison reasoning',
                'error recovery',
                'optimisation steps',
                'lab reasoning',
                'result interpretation',
                'metric analysis',
                'quality assurance',
                'integration planning',
                'revision connection',
                'exam-style reasoning'
            ),
            '.'
        )
    END AS question,
    CASE cm.mode_id
        WHEN 1 THEN CONCAT(
            'A strong definition for ', cc.name, ' should explain ',
            ELT(
                cs.slot,
                'the core idea',
                'the key terms and symbols',
                'the normal workflow order',
                'the responsibility of major parts',
                'what enters and what leaves the system',
                'the governing rule or formula',
                'how information is represented',
                'what trade-off is being balanced',
                'how errors are checked',
                'why efficiency matters',
                'what keeps the system safe',
                'what each abstraction hides',
                'which step comes first and why',
                'when the common edge case appears',
                'how the concept is used in practice',
                'what alternative it should be compared against',
                'how failure is handled',
                'how the approach can be improved',
                'what a lab observer should measure',
                'how results should be interpreted',
                'which metric proves success',
                'what quality checkpoint confirms readiness',
                'where the concept connects with other modules',
                'how to summarize the concept in one revision sentence',
                'how the idea appears in an exam question'
            ),
            ' within ', cc.discipline_label, '.'
        )
        WHEN 2 THEN CONCAT(
            'Use this structure: 1) state the principle in ', cc.name,
            ', 2) connect it to ', cc.discipline_label,
            ', and 3) give one realistic example plus one limitation.'
        )
        WHEN 3 THEN CONCAT(
            'Correct option: A. ',
            'A describes the concept accurately for ', cc.name,
            '; B ignores context, C over-generalises the idea, and D confuses it with an unrelated task.'
        )
        ELSE CONCAT(
            'Suggested approach: identify the requirement, choose the correct method from ', cc.name,
            ', justify each step, and finish by checking the result against one expected behaviour in ',
            cc.discipline_label, '.'
        )
    END AS answer,
    CASE
        WHEN cm.mode_id = 4 OR cs.slot IN (5, 9, 13, 17, 21, 25) THEN 'hard'
        WHEN cm.mode_id = 2 OR cs.slot IN (2, 6, 10, 14, 18, 22) THEN 'medium'
        ELSE 'easy'
    END AS difficulty,
    CASE
        WHEN MOD(cc.id + cs.slot + cm.mode_id, 5) = 0 THEN CURDATE()
        WHEN cm.mode_id = 4 OR cs.slot IN (5, 9, 13, 17, 21, 25) THEN DATE_ADD(CURDATE(), INTERVAL 1 DAY)
        WHEN cm.mode_id = 2 OR cs.slot IN (2, 6, 10, 14, 18, 22) THEN DATE_ADD(CURDATE(), INTERVAL 2 DAY)
        ELSE DATE_ADD(CURDATE(), INTERVAL 4 DAY)
    END AS next_review,
    CASE
        WHEN MOD(cc.id + cs.slot + cm.mode_id, 5) = 0 THEN DATE_SUB(CURDATE(), INTERVAL 1 DAY)
        ELSE NULL
    END AS last_reviewed
FROM course_context cc
INNER JOIN concept_slots cs
INNER JOIN card_modes cm;
