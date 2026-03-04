// 20230609 NAKAHARA Yuki
// LINE API TEST
// https://www2.kobe-u.ac.jp/~tnishida/programming/GAS-03.html
// https://itc.tokyo/gas/gas-line-bot-with-chatgpt/
// https://developers.line.biz/console/channel/1661365123/messaging-api

const channelAccessToken = "";
const replyUrl = "https://api.line.me/v2/bot/message/reply"; 

const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet_userID    = ss.getSheetByName("userID"  );
const sheet_Log       = ss.getSheetByName("Log"     );
const sheet_KeyLog    = ss.getSheetByName("KeyLog"  );
const sheet_reminder  = ss.getSheetByName("reminder");

const date = new Date();

function doPost(e)
{
  sheet_Log.appendRow([new Date(), e.postData.contents]);

  const data    = JSON.parse(e.postData.contents); // LINE から来た json データを JavaScript のオブジェクトに変換する
  const events  = data.events;
  const event   = events[0];
  const userID  = event.source.userId;

  if (event.type == 'postback')
  {
    // sheet_Log.appendRow([event.type]);
    // push(userID,'処理中。。。')
    if(event.postback.data.includes("Key")) 
    {
      borrowAndReturnKey(event); 
    }
    else if(event.postback.data.includes("Reminder"))
    {
      checkReminder(event);
    }
  }
  else if(event.type == 'message' && event.message.type == 'text')
  {
    if(event.message.text.includes('userName') || event.message.text.includes('reminder') || event.message.text.includes('Remind')){
      if(setting(event)) return ;
    }
    
    const userName = userIdManagement(event);
    if(!userName) return;

    if(event.message.type == 'text')
    {
      switch(event.message.text){
        case "schedule":
          TT(event);
          break;
        case "MusicTips":
          trivia(event);
          break;
        case "WheresKey":
          keyManagement(event);
          break;
        case "HowtoUse":
          information(event);
          break;
        case "Reminder":
          reminder(event);
          break;
        case "Just??toDaystoEvent":
          contdown(event);
          break;
        default:
          repGPT(event);
      }
    }
  }
}

function reminder(event)
{
  var contents = {
    replyToken: event.replyToken,
    messages: [{ 
      "type": "template",
      "altText": "リマインダー",
      "template": {
        "type": "buttons",
        "title": "リマインダー",
        "text": "Please select",
        "actions": [
          {
            "type": "postback",
            "label": "リマインダーの登録",
            "data": "addReminder",
          },
          {
            "type": "postback",
            "label": "リマインダーの確認",
            "data": "checkReminder",
          },
          {
            "type": "postback",
            "label": "リマインダーの削除",
            "data": "deleteReminder",
          },
        ]
      }
    },]
  }
  reply(contents);
}

function checkReminder(event)
{
  const userId_chechReminder = event.source.userId;
  const key = event.postback.data;
  
  switch(key){
    case "addReminder":
      var contents = {
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:  'このように入力してください！\n reminder\n リマインドしたい日付 \n 内容　\n (例)\nreminder\n2023/11/04\n 九工大定期演奏会！！'}],
      };
      reply(contents);
      break;
    case "checkReminder":
      // // 井上＆岩崎
      var sendMessage_remind = allReminder();
      var contents = {
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:  sendMessage_remind}],
      };
      reply(contents);
      break;
    case "deleteReminder":
      var sendMessage_remind_del = "消去したいリマインダーのリマインダーIDを確認してください\n(例)\ndelRemind\n1\n----------\n" 
      sendMessage_remind_del = sendMessage_remind_del+allReminder()
      var contents = {
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:  sendMessage_remind_del}],
      };
      reply(contents);
      break;
  }
}

function allReminder()
{
  var sendMessage_remind = "【今後の予定】"
  var lastRow = sheet_reminder.getLastRow()
  if(lastRow == 0)
  {
    sendMessage_remind = "予定は見つかりませんでした。"
    return sendMessage_remind;
  }
  var data = sheet_reminder.getRange(1,1,lastRow,3).getValues(); // A列~C列のデータを取得

  var yesterday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1); // 昨日の日付を取得
  var flag = 0;
  for (var i = 0; i < lastRow; i++)
  {
    var date_re = new Date(data[i][2]);
    var reminderId = i+1;
    if (date_re > yesterday)
    { // 昨日以降の日付の場合
      var month = (date_re.getMonth() + 1).toString(); // 月を取得して文字列に変換
      var day = date_re.getDate().toString(); // 日を取得して文字列に変換
      var formattedDate = month + "月" + day + "日"; // フォーマットした日付文字列
      sendMessage_remind = sendMessage_remind + "\nリマインダーID："+reminderId+"\n"
      sendMessage_remind = sendMessage_remind + "日付："+formattedDate+"\n"
      sendMessage_remind = sendMessage_remind + "名前："+findUsername(data[i][1])+"\n"
      sendMessage_remind = sendMessage_remind + "内容：\n"+data[i][0]+"\n"
      sendMessage_remind = sendMessage_remind + "----------------"
      flag ++;
    }
  }
  // sheet_Log.appendRow([flag]);
  if (flag == 0)
  {
    sendMessage_remind = "予定は見つかりませんでした。"
  }
  return sendMessage_remind;
}

function doRemindKeys()
{
  var key500t   = sheet_KeyLog.createTextFinder('Key500');
  var key500    = key500t.findAll();
  var keyCRoomt = sheet_KeyLog.createTextFinder('KeyClubRoom');
  var keyCRoom  = keyCRoomt.findAll();
  // console.log(keyCRoom.length,key500.length)
  var sendMessage = "【----要確認----】\n"
  if( key500.length %2 == 1 || keyCRoom.length %2 == 1)
  {
    if(key500.length %2 == 1)
    {
      var key500BorrowId = key500[key500.length-1].offset(0, -1).getValue()
      sendMessage = sendMessage + "500人講義室の鍵が返却されていません。"
      push(key500BorrowId,sendMessage)
    }
    if(keyCRoom.length %2 == 1)
    {
      var keyCRoomBorrowId = keyCRoom[keyCRoom.length-1].offset(0, -1).getValue()
      sendMessage = sendMessage + "部室の鍵が返却されていません。"
      push(keyCRoomBorrowId,sendMessage)
    }
    
  }
  return 0;
}

function weeklyMessage(){
  var broadcastMessage = weekSchedule()+'\n\n==========\n\n';
  broadcastMessage += weekRemind()
  sheet_Log.appendRow([new Date(), broadcastMessage]);
  broadcast(broadcastMessage);

  // console.log(broadcastMessage)
}

function weekRemind()
{
  var startRow = 1; // チェックを開始する行番号
  var column = 3; // チェックする列番
  var endRow = sheet_reminder.getLastRow(); // チェックを終了する行番号
  var broadcastMessage = "【今週のリマインダー】"
  for (let prm = 0; prm < 7 ; prm++){
    var currentTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()+prm);
    console.log('currentTime : '+currentTime)
    console.log(endRow)

    if(endRow != 0){
      for (var row = startRow; row <= endRow; row++) {
        var cell = sheet_reminder.getRange(row, column);
        var cellValue = cell.getValue();
        var cellTime = new Date(cellValue.getFullYear(), cellValue.getMonth(), cellValue.getDate());
        console.log('cellTime : '+cellTime)
        var flag = 0;
        if (cellTime.getTime() == currentTime.getTime()) {
          // sheet_Log.appendRow(['in if'])
          console.log('in if');
          var userName = findUsername(sheet_reminder.getRange(row, column-1).getValue())
          console.log('userName : '+ userName);
          broadcastMessage += "\n日付："+Utilities.formatDate(currentTime, 'JST', 'yyyy-MM-dd')+"\n名前："+userName+"\n内容："+sheet_reminder.getRange(row, column-2).getValue()+'\n----'
          console.log(broadcastMessage);
          flag++;
        } 
      }
    }
  }
  // console.log(broadcastMessage)
  return broadcastMessage;
}

function getMessage2(prm)
{
  // prm = 3
  const week = ['日','月','火','水','木','金','土'];
  var cal = CalendarApp.getCalendarById('kitsocalender@gmail.com');
  var date = new Date();
  var strBody = '';
  var strHeader = '';
  date = new Date(date.getFullYear(),date.getMonth(),date.getDate() + prm); // 修正
  strHeader += Utilities.formatDate(date,'JST','M/d')
                + '(' +week[date.getDay()] + ')\n';
  // 内容
  strBody = getEvents(cal,date);
  if ( _isNull(strBody) ) {
    const dayOfWeek = date.getDay();
    if(dayOfWeek >= 1 && dayOfWeek <= 3) {
      strBody = '個人練習日です。合奏予定はありません';
    } else if(dayOfWeek === 4 || dayOfWeek === 5) {
      strBody = '開放日です。個人練習ができます';
    } else {
      strBody = '予定はありません';
    }
  }
  // console.log(strHeader + strBody)
  return strHeader + strBody;
}

function weekSchedule(){
  // 20230630 中原：もうすこし綺麗に書きたいなぁ　
  var broadcastMessage = '【今週の練習予定 ※変更の可能性あり※】\n';
  broadcastMessage += getMessage2(0)+'\n-----\n';
  broadcastMessage += getMessage2(1)+'\n-----\n';
  broadcastMessage += getMessage2(2)+'\n-----\n';
  broadcastMessage += getMessage2(3)+'\n-----\n';
  broadcastMessage += getMessage2(4)+'\n-----\n';
  broadcastMessage += getMessage2(5)+'\n-----\n';
  broadcastMessage += getMessage2(6);
  // broadcast(broadcastMessage)
  console.log(broadcastMessage)
  return broadcastMessage;
}

function TT(event)
{
  var contents = {
      replyToken: event.replyToken,
      messages: [{ type: 'text', text:  getMessage(0)}],
    };
    reply(contents);
}

// 工藤
/**
* メッセージ内容取得
* @param {number} 今日起算の日数
* @return {string} メッセージ内容
*/
function getMessage(prm)
{
  // prm = 3
  const week = ['日','月','火','水','木','金','土'];
  var cal = CalendarApp.getCalendarById('kitsocalender@gmail.com');
  var date = new Date();
  var strBody = '';
  var strHeader = '';
  // タイトル
  if ( prm==0 ) {
    strHeader = '本日 ';
  } else if ( prm==1 ) {
    strHeader = '明日 ';
  }
  date = new Date(date.getFullYear(),date.getMonth(),date.getDate() + prm); // 修正
  strHeader += Utilities.formatDate(date,'JST','M/d')
                + '(' +week[date.getDay()] + ') の予定\n';
  // 内容
  strBody = getEvents(cal,date);
  if ( _isNull(strBody) ) {
    const dayOfWeek = date.getDay();
    if(dayOfWeek >= 1 && dayOfWeek <= 3) {
      strBody = '個人練習日です。合奏予定はありません';
    } else if(dayOfWeek === 4 || dayOfWeek === 5) {
      strBody = '開放日です。個人練習ができます';
    } else {
      strBody = '今日は予定はありません';
    }
  }
  // console.log(strHeader + strBody)
  return strHeader + strBody;
}

/**
* カレンダーイベント内容取得
* @param {object} カレンダー
* @param {date} 日付
* @return {string} イベント内容
*/
function getEvents(prmCal,prmDate)
{
  var strEvents = '';
  var strStart = '';
  var strEnd = '';
  var strTime = '';
  var strLocation = '';
  var strDescription = '';
  if ( !_isNull(prmCal) ) {
     var arrEvents = prmCal.getEventsForDay(new Date(prmDate));
     for (var i=0; i<arrEvents.length; i++) {
       if ( !_isNull(strEvents) ) strEvents += '\n';
       strStart = _HHmm(arrEvents[i].getStartTime());
       strEnd = _HHmm(arrEvents[i].getEndTime());
       if ( strStart===strEnd ) {
         strTime = ' ';
       } else {
         strTime = strStart + '～' + strEnd;
       }
       strEvents += strTime + '【' + arrEvents[i].getTitle() + '】';
       strLocation = arrEvents[i].getLocation();
       strDescription = arrEvents[i].getDescription();
       if ( !_isNull(strDescription) ) strEvents += '\n説明：\n' + strDescription;
       if ( !_isNull(strLocation) ) strEvents += '\n場所：\n' + strLocation;
       
     }
  }
  return strEvents;
}

/**
* 時刻フォーマット
*/
function _HHmm(str)
{
  return Utilities.formatDate(str,'JST','HH:mm');
}

/**
* NULL判定
* @param {object} 判定対象
* @return {bool} NULLの場合TRUE
*/
function _isNull(prm)
{
  if ( prm=='' || prm===null || prm===undefined ) {
    return true;
  } else {
    return false;
  }
}

// 清水
function contdown(event)
{
  var sendMessage;
  const y = `${date.getFullYear()}/1/1`
  const nt = new Date(y).getTime();
  const t  = Date.now() - nt;
  const n = 307 - Math.floor( t / 1000 / 60 / 60 / 24 );// 11/4 - 今日
  if(n>0 && n!=0){
    // sendMessage = "定期演奏会まであと" + n +"日！\nここで"+n+"に関する雑学です\n"+chatGPT(n+'に関する雑学を１つ教えて')
    sendMessage = "第３２回定期演奏会まであと" + n +"日！"
  }else if(n==0){
    sendMessage = "本番当日！頑張ろう！"
  }else if(n<0){
    sendMessage = "本番お疲れさま！"
  }
  var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: sendMessage }],
        };
  reply(contents);
}

function borrowAndReturnKey(event)
{
  const key = event.postback.data
  const userID = event.source.userId;
  var key500t= sheet_KeyLog.createTextFinder('Key500');
  var key500 = key500t.findAll();
  var keyCRoomt = sheet_KeyLog.createTextFinder('KeyClubRoom');
  var keyCRoom = keyCRoomt.findAll();
  switch(key)
  {
    case 'borrowKey500':
      if(key500.length %2 != 0)
      {
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  'すでに借りられています。' }],
        };
        reply(contents);
      }
      else 
      {
        sheet_KeyLog.appendRow([date,userID,'borrowKey500']);
        sheet_Log.appendRow([date,userID,'borrowKey500']);
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '５００人講義室を借りました。' }],
        };
        reply(contents);
      }
      break;
    case 'returnKey500':
      if(key500.length %2 != 1)
      {
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '鍵は借りられていません。' }],
        };
        reply(contents);
      }
      else 
      {
        sheet_KeyLog.appendRow([date,userID,'returnKey500']);
        sheet_Log.appendRow([date,userID,'returnKey500']);
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '５００人講義室の鍵を返しました。' }],
        };
        reply(contents);
      }
      break;
    case 'borrowKeyClubRoom':
      if(keyCRoom.length %2 != 0)
      {
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  'すでに借りられています。' }],
        };
        reply(contents);
      }
      else 
      {
        sheet_KeyLog.appendRow([date,userID,'borrowKeyClubRoom']);
        sheet_Log.appendRow([date,userID,'borrowKeyClubRoom']);
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '部室の鍵を借りました。' }],
        };
        reply(contents);
      }
      break;
    case 'returnKeyClubRoom':
      if(keyCRoom.length %2 != 1)
      {
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '鍵は借りられていません。' }],
        };
        reply(contents);
      }
      else 
      {
        sheet_KeyLog.appendRow([date,userID,'returnKeyClubRoom']);
        sheet_Log.appendRow([date,userID,'returnKeyClubRoom']);
        var contents = {
          replyToken: event.replyToken,
          messages: [{ type: 'text', text:  '部室の鍵を返しました。' }],
        };
        reply(contents);
      }
      break;
    case 'whereKey':
      whereKey(event);
      break;
  }
}

function trivia(event)
{
  var gptMessage = chatGPT( 'オーケストラにまつわる雑学を1つ教えて');
  var contents = {
    replyToken: event.replyToken,
    messages: [{ type: 'text', text:  gptMessage }],
  };
  reply(contents);
}

function keyManagement(event)
{
  var contents = {
    replyToken: event.replyToken,
    messages: [{ 
      "type": "template",
      "altText": "鍵の管理 500人講義室",
      "template": {
        "type": "buttons",
        "title": "鍵の管理 500人講義室",
        "text": "Please select",
        "actions": [
          {
            "type": "postback",
            "label": "５００人講義室の鍵を借りた",
            "data": "borrowKey500"
          },
          {
            "type": "postback",
            "label": "５００人講義室の鍵を返した",
            "data": "returnKey500"
          },
        ]
      }
    },
    { 
      "type": "template",
      "altText": "鍵の管理 部室",
      "template": {
        "type": "buttons",
        "title": "鍵の管理 部室",
        "text": "Please select",
        "actions": [
          {
            "type": "postback",
            "label": "部室の鍵を借りた",
            "data": "borrowKeyClubRoom"
          },
          {
            "type": "postback",
            "label": "部室の鍵を返した",
            "data": "returnKeyClubRoom"
          },
        ]
      }
    },
    { 
      "type": "template",
      "altText": "鍵の管理 いまどこ？",
      "template": {
        "type": "buttons",
        "title": "鍵の管理 いまどこ？",
        "text": "Please select",
        "actions": [
          {
            "type": "postback",
            "label": "いまどこ？",
            "data": "whereKey"
          },
        ]
      }
    },
    ],
  };
  reply(contents);
}

function repGPT(event)
{
  let message     = event.message.text;
  var gptMessage  = chatGPT(message);
  var contents = {
    replyToken: event.replyToken,
    messages: [{ type: 'text', text:  gptMessage }],
  };
  reply(contents);
}

function information(event)
{
  const comment = 
  "kitso line bot へようこそ！\n【使い方】\nボタンを押すと機能が使えるよ！\n・REMINDER\n→ このアカウントを登録している人に対してリマインダーを設定することができます。\n・SCHEDULE\n→ Googleカレンダーに追加されてる予定を表示します。\n・WHERE'S KEY\n→ 誰が鍵持っているかを確認できます。\n・JUST ?? DAYS TO EVENT\n→ 登録されているイベントまであと何日かを表示します。\n・MUSIC TIPS\n→ 音楽に関するTipsをChatGPT君が教えてくれます。\n・その他任意の文章を送るとChatGPT君が答えてくれます（※apiの上限を超えると無視するようになります。使いすぎ注意！！）。"
  var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:  comment }],
          };
  reply(contents);
}

function whereKey(event)
{
    var key500t= sheet_KeyLog.createTextFinder('Key500');
    var key500 = key500t.findAll();
    var keyCRoomt = sheet_KeyLog.createTextFinder('KeyClubRoom');
    var keyCRoom = keyCRoomt.findAll();
    var messageCRoom
    var message500

    if(key500.length%2 != 0){
      const whereKeyLatest500 = key500[key500.length-1]
      const whereKey500UserId = whereKeyLatest500.offset(0,-1).getValue()
      var textFinder = sheet_userID.createTextFinder(whereKey500UserId);
      var cells = textFinder.findAll();
      const whereKey500UserName = cells[0].offset(0,1).getValue();
      message500 = "500人講義室の鍵は"+whereKey500UserName +"さんが持っています。";
    }
    else
    {
      message500 = "500人講義室の鍵は借りられていません。";
    }

    if(keyCRoom.length%2 != 0){
      const whereKeyLatestCRoom = keyCRoom[keyCRoom.length-1]
      const whereKeyCRoomUserId = whereKeyLatestCRoom.offset(0,-1).getValue()
      var textFinder = sheet_userID.createTextFinder(whereKeyCRoomUserId);
      var cells = textFinder.findAll();
      const whereKeyCRoomUserName = cells[0].offset(0,1).getValue();
      messageCRoom = "部室の鍵は"+whereKeyCRoomUserName+"さんが持っています。";
    }
    else
    {
      messageCRoom = "部室の鍵は借りられていません。"
    }
    const sendMessage = message500 +"\n"+ messageCRoom;
    var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:  sendMessage }],
          };
    reply(contents)
}

function setting(event)
{
  // 特殊操作用
  let bool = false;
  const userId = event.source.userId
  const splitMessageText = event.message.text.split("\n")
  const splitMessageTextLength = splitMessageText.length
  if(splitMessageText.length > 1)
  {
    const processing = splitMessageText[0];
    const line2 = splitMessageText[1];
    // sheet_Log.appendRow([processing,line2]);
    switch(processing){
      //　ユーザーネームの登録
      case "userName":
        // IDが既に存在するかの確認
        var textFinder = sheet_userID.createTextFinder(userId);
        var cells = textFinder.findAll();
        if(cells.length == "0"){
          var createUserName = line2
          sheet_Log.appendRow(['Regist user name. ',userId,createUserName]);
          sheet_userID.appendRow([userId, createUserName]);
          var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:  '登録しました' }],
          };
        }
        else 
        {
          var updateUserName = line2
          cells[0].offset(0,1).setValue(line2);
          var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text:  '名前を変更しました。' }],
          };
          sheet_Log.appendRow(['Name changed. ',userId,updateUserName]);
        }
        reply(contents);
        bool = true;
        break;
      case "reminder":
        let remindMessage = ""; 
        // sheet_Log.appendRow(['aaaaaa']);
        // const remindDate = line2;
        const remindDate = Utilities.formatDate(new Date(line2), 'JST', 'yyyy-MM-dd')
        // sheet_Log.appendRow(['aaaaaa']);
        for(let i = 2 ; i < splitMessageTextLength-1; i++)
        {
          remindMessage = remindMessage + splitMessageText[i] + "\n";
        }
        remindMessage = remindMessage + splitMessageText[splitMessageTextLength-1]
        // 昇順になるようにリマインダーを追加
        var startRow = 1; // チェックを開始する行番号
        var column = 3; // チェックする列番

        var endRow = sheet_reminder.getLastRow(); // チェックを終了する行番号
        for (var row = startRow; row <= endRow; row++) {
          var remindSheetDate = Utilities.formatDate(new Date(sheet_reminder.getRange(row,column).getValue().valueOf()),'JST', 'yyyy-MM-dd')
          // sheet_Log.appendRow([new Date(sheet_reminder.getRange(row,column).getValue()).valueOf(),new Date(remindDate).valueOf()]);
          // if(new Date(sheet_reminder.getRange(row,column).getValue()).valueOf() >= new Date(remindDate).valueOf())
          // {
            // sheet_Log.appendRow([remindSheetDate,remindDate]);
            if(remindSheetDate >= remindDate)
            {
            sheet_reminder.insertRowBefore(row)
            sheet_reminder.getRange(row,1).setValue(remindMessage)
            sheet_reminder.getRange(row,2).setValue(userId)
            sheet_reminder.getRange(row,3).setValue(remindDate)
            break;
          }
        }
        // sheet_reminder.appendRow([remindMessage,userId,remindDate]);
        sheet_Log.appendRow([date,'add reminder',userId,remindMessage]);
        const repMessage = "登録しました!\n 【内容】\n リマインド日時:"+remindDate+"\n ユーザー名："+userIdManagement(event)+"\n 内容：\n"+ remindMessage;
        var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: repMessage}],
          };
        reply(contents);
        bool = true;
        break;
      case "delRemind":
        const reminderID = line2;
        const reminderUserID = sheet_reminder.getRange(reminderID,2).getValue()
        // sheet_Log.appendRow([userId,reminderID,reminderUserID]);
        if(userId == reminderUserID){
          sheet_reminder.deleteRow(reminderID)
          var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: 'リマインダーを削除しました。'}],
          };
          reply(contents);
        }
        else
        {
          var contents = {
            replyToken: event.replyToken,
            messages: [{ type: 'text', text: '!!!  リマインダーを削除できませんでした'}],
          };
          reply(contents);
        }
        bool = true;
        break;
    }
  }
  return bool;
}

function findUsername(userId)
{
  var textFinder = sheet_userID.createTextFinder(userId);
  var cells = textFinder.findAll();
  var username
  switch(cells.length){
    case 0:
      // 初期設定
      let contents = {
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:  'ユーザーが存在しません。登録してください\n(例)\nuserName\nなかはら' }],
      };
      reply(contents);
      username = false;
      break;
    case 1:
      username = cells[0].offset(0,1).getValue();
      break;
    default:
  }
  return username
}

function userIdManagement(event)
{
  let userId  = event.source.userId;
  var textFinder = sheet_userID.createTextFinder(userId);
  var cells = textFinder.findAll();
  var username
  
  switch(cells.length){
    case 0:
      // 初期設定
      // Logger.log('ユーザーが存在しません');
      let contents = {
        replyToken: event.replyToken,
        messages: [{ type: 'text', text:  'ユーザーが存在しません。登録してください\n(例)\n userName \n なかはら' }],
      };
      reply(contents);
      username = false;
      break;
    case 1:
      // Logger.log('セル位置 :  ' + cells[0].getA1Notation()) ;
      username = cells[0].offset(0,1).getValue();
      // Logger.log('名前 :  ' + cells[0].offset(0,1).getValue()) ;
      break;
    default:
      // Logger.log('エラー');
  }
  return username
}

function timeTable(event, sheet_TT)
{
  // A1セルを選択
  var range = sheet_TT.getRange('A1');
  // セルの値を取得
  var value = range.getValue();
  let TT = value;
  // 送信するデータをオブジェクトとして作成する
  let contents = {
    replyToken: event.replyToken,
    messages: [{ type: 'text', text:  TT }],
  };
  reply(contents); 
}

// 　----< function chatGPT >----
function chatGPT(message)
{
  const gptKey  = "";
  const ep      = "https://api.openai.com/v1/chat/completions";
  const model   = "gpt-3.5-turbo";

  const messages = [
              {
                "role": "system", "content": 'あなたは優秀なアシスタントで、質問に何でも答えます。'
              },
              {"role": "user", "content": message}
            ];

  //requestペイロード
   const payload = {
        "model": model,
        "messages":messages,
        "max_tokens":3000
    };

  //request本体
  const options = {
          "method": "post",
          "headers": {
            "Content-Type": "application/json",
            'Authorization': 'Bearer ' + gptKey,
            },
          "payload": JSON.stringify(payload)
  };

  //requestの実行
  try {
    var response  = UrlFetchApp.fetch(ep, options);
    var json      = response.getContentText();
    var data      = JSON.parse(json);
    var answer = data["choices"][0]["message"]["content"];
  } catch(e) {
    answer = '返事がない…ただの屍のようだ…'
  }
  return answer;
}

// 　----< function reply >----
function reply(contents)
{
// LINE にデータを送り返すときに使う URL
  let options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + channelAccessToken
    },
    payload: JSON.stringify(contents) // 送るデータを JSON 形式に変換する
  };
  return UrlFetchApp.fetch(replyUrl, options);
}

function broadcast(broadcastMessage)
{
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/broadcast', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + channelAccessToken,
    },
    payload: JSON.stringify({
      messages: [
        {
            type: 'text',
            text: broadcastMessage
        }
      ]
    }),
  });
}

// ---< １対１メッセージ送信用 >---
// ！！！！使いすぎ注意！！！！

function push(userID,pushMessage)
{
  // const userID='U35691de6fca35f2041b6e4fe4a597079'
  // const pushMessage='テスト'
  // sheet_Log.appendRow(['push',userID,pushMessage]);
   UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + channelAccessToken,
    },
    payload: JSON.stringify({
      to:userID,
      messages: [
        {
            type: 'text',
            text: pushMessage
        }
      ]
    }),
  }); 
}