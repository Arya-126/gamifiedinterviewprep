require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check track and topic distribution for verified problems
  const result = await pool.query(`
    SELECT cp.id, cp.title, cp.difficulty, cp.track, cp.level,
           cp."topicId", t.name as topic_name, t.slug as topic_slug
    FROM "CodingProblem" cp
    LEFT JOIN "AssessmentTopic" t ON cp."topicId" = t.id
    WHERE cp.verified = true
    ORDER BY cp.track, cp.level, cp.difficulty
  `);
  
  console.log('Total verified:', result.rows.length);
  
  let noTrack = 0, noTopic = 0, noTrackNoTopic = 0;
  const trackCounts = {};
  
  for (const r of result.rows) {
    const trackSlug = r.track || r.topic_slug || 'NO_TRACK_OR_TOPIC';
    trackCounts[trackSlug] = (trackCounts[trackSlug] || 0) + 1;
    
    if (!r.track) noTrack++;
    if (!r.topicId) noTopic++;
    if (!r.track && !r.topicId) {
      noTrackNoTopic++;
      console.log('  NO TRACK OR TOPIC: [' + r.difficulty + '] ' + r.title);
    }
  }
  
  console.log('\nNo track field:', noTrack);
  console.log('No topicId:', noTopic);
  console.log('No track AND no topic (INVISIBLE):', noTrackNoTopic);
  
  console.log('\nTrack distribution:');
  for (const [track, cnt] of Object.entries(trackCounts).sort((a,b) => a[0].localeCompare(b[0]))) {
    console.log('  ' + track + ': ' + cnt);
  }

  // Also check what the original 14 seed problems look like vs pipeline ones
  const originals = await pool.query(`
    SELECT id, title, track, level, source, "topicId"
    FROM "CodingProblem"
    WHERE verified = true AND source IS NOT NULL
    LIMIT 20
  `);
  console.log('\nSample problems with source field:');
  for (const r of originals.rows) {
    console.log('  ' + r.title + ' | source=' + r.source + ' | track=' + r.track + ' | level=' + r.level + ' | topicId=' + (r.topicId || 'NULL'));
  }

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
