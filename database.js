const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = new Database('fotd.db');

db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        isVerified INTEGER DEFAULT 0,
        verifyCode TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wishlist (
        user_id INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS roadmap_phases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        order_index INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roadmap_features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phase_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        status TEXT DEFAULT 'Planned',
        FOREIGN KEY (phase_id) REFERENCES roadmap_phases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS news (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        subject TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT DEFAULT 'Open',
        admin_reply TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
`);

// --- Seed Roadmap Data ---
const phaseCount = db.prepare('SELECT COUNT(*) as count FROM roadmap_phases').get();
if (phaseCount.count === 0) {
    const phases = [
        { title: 'PHASE 1 — Core Survival Foundation', features: [
            { title: 'Health', status: 'In Development' },
            { title: 'Stamina', status: 'In Development' },
            { title: 'Hunger', status: 'In Development' },
            { title: 'Thirst', status: 'In Development' },
            { title: 'Fatigue / Sleep', status: 'In Development' },
            { title: 'Body Temperature', status: 'In Development' },
            { title: 'Immunity', status: 'In Development' },
            { title: 'Pain Level', status: 'In Development' },
            { title: 'Body Part Damage', status: 'In Development' },
            { title: 'Limb Penalties', status: 'In Development' },
            { title: 'Bleeding (Light / Heavy)', status: 'In Development' },
            { title: 'Internal Injuries', status: 'In Development' },
            { title: 'Shock State', status: 'In Development' },
            { title: 'Permanent Damage', status: 'In Development' }
        ]},
        { title: 'PHASE 2 — Infection & Combat', features: [
            { title: 'Infection Stages (1–4)', status: 'In Development' },
            { title: 'Bite vs Scratch', status: 'In Development' },
            { title: 'Temporary Treatment', status: 'In Development' },
            { title: 'Amputation Option', status: 'In Development' },
            { title: 'Infection Timer', status: 'In Development' },
            { title: 'Melee Stamina Cost', status: 'In Development' },
            { title: 'Weapon Durability', status: 'In Development' },
            { title: 'Hit Physics', status: 'In Development' },
            { title: 'Critical Hits (Headshots)', status: 'In Development' },
            { title: 'Weapon Weight Impact', status: 'In Development' },
            { title: 'Aim Sway', status: 'In Development' },
            { title: 'Realistic Reload', status: 'In Development' },
            { title: 'Noise Generation', status: 'In Development' }
        ]},
        { title: 'PHASE 3 — Stealth & Infected AI', features: [
            { title: 'Footstep Noise (Surface-based)', status: 'In Development' },
            { title: 'Sprint Noise Increase', status: 'In Development' },
            { title: 'Gunshot Attraction', status: 'In Development' },
            { title: 'Object Noise Alerts', status: 'In Development' },
            { title: 'Crouch Stealth', status: 'In Development' },
            { title: 'Visibility (Light/Dark)', status: 'In Development' },
            { title: 'Infected Hearing Radius', status: 'In Development' },
            { title: 'Roaming Behavior', status: 'In Development' },
            { title: 'Sound Investigation', status: 'In Development' },
            { title: 'Line of Sight Detection', status: 'In Development' },
            { title: 'Horde Behavior', status: 'In Development' },
            { title: 'Infected Types (Slow / Fast / Crawler / Smart)', status: 'In Development' },
            { title: 'Memory System (Last Known Position)', status: 'In Development' },
            { title: 'Door Breaking', status: 'In Development' },
            { title: 'Obstacle Navigation', status: 'In Development' }
        ]},
        { title: 'PHASE 4 — Survival Systems', features: [
            { title: 'Weight-Based Inventory', status: 'In Development' },
            { title: 'Limited Slots', status: 'In Development' },
            { title: 'Item Condition', status: 'In Development' },
            { title: 'Random Loot', status: 'In Development' },
            { title: 'Stack System', status: 'In Development' },
            { title: 'Quick Access Hotbar', status: 'In Development' },
            { title: 'Backpack Expansion', status: 'In Development' },
            { title: 'Item Combination', status: 'In Development' },
            { title: 'Tool Requirements', status: 'In Development' },
            { title: 'Craft Time', status: 'In Development' },
            { title: 'Blueprint Discovery', status: 'In Development' },
            { title: 'Weapon Upgrades', status: 'In Development' },
            { title: 'Repair System', status: 'In Development' }
        ]},
        { title: 'PHASE 5 — World Building', features: [
            { title: 'Barricading', status: 'Planned' },
            { title: 'Placeable Structures', status: 'Planned' },
            { title: 'Storage Containers', status: 'Planned' },
            { title: 'Safe Zones', status: 'Planned' },
            { title: 'Infected Attacks on Base', status: 'Planned' },
            { title: 'Fortification Upgrades', status: 'Planned' },
            { title: 'Day/Night Cycle', status: 'Planned' },
            { title: 'Weather (Rain / Fog / Heat / Cold)', status: 'Planned' },
            { title: 'Dynamic Lighting', status: 'Planned' },
            { title: 'Fire System', status: 'Planned' }
        ]},
        { title: 'PHASE 6 — Player Experience', features: [
            { title: 'Walk / Jog / Sprint', status: 'Planned' },
            { title: 'Vault / Climb', status: 'Planned' },
            { title: 'Prone (Optional)', status: 'Planned' },
            { title: 'Weight Impact Movement', status: 'Planned' },
            { title: 'Injury-Based Movement', status: 'Planned' },
            { title: 'Minimal HUD', status: 'Planned' },
            { title: 'Audio Feedback', status: 'Planned' },
            { title: 'Visual Effects (Blur / Blood)', status: 'Planned' },
            { title: 'Dynamic Tips', status: 'Planned' }
        ]},
        { title: 'PHASE 7 — Progression', features: [
            { title: 'Skill System', status: 'Planned' },
            { title: 'Experience System', status: 'Planned' },
            { title: 'Traders (Optional)', status: 'Planned' },
            { title: 'Reputation', status: 'Planned' },
            { title: 'Fear System', status: 'Planned' },
            { title: 'Hallucinations', status: 'Planned' },
            { title: 'Panic Effects', status: 'Planned' }
        ]},
        { title: 'PHASE 8 — Advanced Features', features: [
            { title: 'Fuel System', status: 'Planned' },
            { title: 'Vehicle Damage', status: 'Planned' },
            { title: 'Noise Attraction', status: 'Planned' },
            { title: 'Storage', status: 'Planned' },
            { title: 'Proximity Voice Chat', status: 'Planned (Post-Launch)' },
            { title: 'Player Interaction', status: 'Planned (Post-Launch)' },
            { title: 'Loot Sharing', status: 'Planned (Post-Launch)' },
            { title: 'Friendly Fire', status: 'Planned (Post-Launch)' }
        ]},
        { title: 'PHASE 9 — Persistence & Realism', features: [
            { title: 'Save System', status: 'Planned' },
            { title: 'Loot Persistence', status: 'Planned' },
            { title: 'Infected Persistence', status: 'Planned' },
            { title: 'Base Persistence', status: 'Planned' },
            { title: 'Bullet Penetration', status: 'Planned' },
            { title: 'Bullet Drop', status: 'Planned' },
            { title: 'Sound Occlusion', status: 'Planned' },
            { title: 'Smell System', status: 'Planned' },
            { title: 'Body Dragging', status: 'Planned' },
            { title: 'Carry Players', status: 'Planned' },
            { title: 'Dynamic Events', status: 'Planned' }
        ]},
        { title: 'POST-LAUNCH & EXTRAS', features: [
            { title: 'Companion App', status: 'Planned (Post-Launch)' },
            { title: 'Community Events', status: 'Planned (Post-Launch)' }
        ]},
        { title: 'RELEASE', features: [
            { title: 'Game Release (Target 2027/2028)', status: 'In Development' }
        ]}
    ];
    
    const insertPhase = db.prepare('INSERT INTO roadmap_phases (title, order_index) VALUES (?, ?)');
    const insertFeature = db.prepare('INSERT INTO roadmap_features (phase_id, title, status) VALUES (?, ?, ?)');

    phases.forEach((phase, index) => {
        const info = insertPhase.run(phase.title, index);
        phase.features.forEach(feature => {
            insertFeature.run(info.lastInsertRowid, feature.title, feature.status);
        });
    });
    
    db.prepare('INSERT INTO news (title, content) VALUES (?, ?)').run(
        'Welcome to the Wasteland', 
        'Development has officially begun on Fall Of The Dead. Follow our roadmap for live updates on core survival mechanics.'
    );
        db.prepare('INSERT INTO news (title, content) VALUES (?, ?)').run(
        'Release Planning & Roadmap Update', 
        'We are officially entering the release planning phase! While the target window remains late 2027 to early 2028, core survival mechanics (Phases 1-4) are heavily under development. Read the full roadmap below for details.'
    );
}

module.exports = db;