import Snoocore from 'snoocore';
import request from 'request';
import json2md from 'json2md';

const ACCOUNT_NAME = process.env.REDDIT_ACCOUNT_NAME;
const ACCOUNT_PASSWORD = process.env.REDDIT_ACCOUNT_PASSWORD;
const REDDIT_API_KEY = process.env.REDDIT_API_KEY;
const REDDIT_API_SECRET = process.env.REDDIT_API_SECRET;
const SUBREDDIT = process.env.SUBREDDIT;
const PREMIER_LEAGUE_ID = 426;

const reddit = new Snoocore({
  userAgent: '/u/devjunk tablebot@0.0.1', // unique string identifying the app
  oauth: {
    type: 'script',
    key: REDDIT_API_KEY,
    secret: REDDIT_API_SECRET,
    username: ACCOUNT_NAME,
    password: ACCOUNT_PASSWORD,
    scope: [ 'identity', 'modconfig' ]
  }
});

const findArsenalIndex = dataset => {
  let arsenal = dataset.reduce((prev,current,index) => {
      if (current.teamName === 'Arsenal FC') {
        return index;
      }
      return prev;
  }, {});
  return arsenal;
};
const buildTableObject = (dataset,arsenalIndex) => {
  const range = 3;
  let count = 0;
  return dataset.reduce((prev,current,index) => {
    let inRange = false;
    for(let i = 1; i <= range; i++) {
      if (count === range && index !== arsenalIndex) {
        break;
      };
      if (index === arsenalIndex-i || index === arsenalIndex+i || index === arsenalIndex) {
        if (index !== arsenalIndex) {
          count++;
        }
        inRange = true;
      }
    }
    return inRange ? prev.concat(current) : prev;
  },[]);
};

const buildMarkdownTable = tableData => {
  return json2md({
    table: {
      headers: ['\\#','Team','GD','Points'],
      rows: tableData.map(team => {
        const teamName = matchSprite(team.teamName);
        return [
          team.position,
          teamName,
          team.goalDifference,
          team.points
        ]
      })
    }
  });
};

const matchSprite = (team) => {
  const teams = {
    "Arsenal FC": () => '[](#sprite1-p1)',
    "AFC Bournemouth FC": () => '[](#sprite1-p218)',
    "Burnley FC": () => '[](#sprite1-p156)',
    "Chelsea FC": () => '[](#sprite1-p4)',
    "Crystal Palace FC": () => '[](#sprite1-p67)',
    "Everton FC": () => '[](#sprite1-p15)',
    "Hull City FC": () => '[](#sprite1-p117)',
    "Leicester City FC": () => '[](#sprite1-p87)',
    "Liverpool FC": () => '[](#sprite1-p3)',
    "Manchester City FC": () => '[](#sprite1-p10)',
    "Manchester United FC": () => '[](#sprite1-p2)',
    "Middlesbrough FC": () => '[](#sprite1-p91)',
    "Southampton FC": () => '[](#sprite1-p38)',
    "Stoke City FC": () => '[](#sprite1-p81)',
    "Sunderland FC": () => '[](#sprite1-p46)',
    "Swansea City FC": () => '[](#sprite1-p39)',
    "Tottenham Hotspur FC": () => '[](#icon-poop)',
    "Watford FC": () => '[](#sprite1-p112)',
    "West Bromwich Albion FC": () => '[](#sprite1-p78)',
    "West Ham United FC": () => '[](#sprite1-p21)'
  };
  if (typeof teams[team] !== 'function') {
    throw new Error('Team name not found');
  }
  return teams[team]();
};

request(`http://api.football-data.org/v1/competitions/${PREMIER_LEAGUE_ID}/leagueTable  `, (err,res,body) => {
  if (err) {
    throw new Error(err);
  }
  const data = JSON.parse(body);
  const arsenalIndex = findArsenalIndex(data.standing);
  const tableObject = buildTableObject(data.standing,arsenalIndex);
  const markdownTable = buildMarkdownTable(tableObject);
  console.log(markdownTable);
  reddit(`/r/${SUBREDDIT}/about/edit.json`)
  .get()
  .then(result => {
    let data = result.data;
    data.api_type = 'json';
    data.sr = data.subreddit_id;
    data.link_type = data.content_options;
    data.type = data.subreddit_type;

    data.description = markdownTable;

    return reddit('/api/site_admin').post(data);
  })
  .done(result => {
    console.log(JSON.stringify(result,null,4));
  });
});
