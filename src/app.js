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
        return [
          team.position,
          team.teamName,
          team.goalDifference,
          team.points
        ]
      })
    }
  });
};

request(`http://api.football-data.org/v1/competitions/${PREMIER_LEAGUE_ID}/leagueTable  `, (err,res,body) => {
  if (err) {
    throw new Error(err);
  }
  const data = JSON.parse(body);
  const arsenalIndex = findArsenalIndex(data.standing);
  const tableObject = buildTableObject(data.standing,arsenalIndex);
  const markdownTable = buildMarkdownTable(tableObject);
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
