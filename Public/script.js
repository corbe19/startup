$(function play(){
  
    function set(key, value) { localStorage.setItem(key, value); }
    function get(key)        { return localStorage.getItem(key); }
    function increase(el)    { set(el, parseInt( get(el) ) + 1); }
    function decrease(el)    { set(el, parseInt( get(el) ) - 1); }
  
    var toTime = function(nr){
      if(nr == '-:-') return nr;
      else { var n = ' '+nr/1000+' '; return n.substr(0, n.length-1)+'s'; }
    };

    function getPlayerName() {
      return localStorage.getItem('userName') ?? 'Mystery player';
    }
  
    function updateStats(){
      $('#stats').html('<div class="padded"><h2>Figures: <span>'+
        '<b>'+get('flip_won')+'</b><i>Won</i>'+
        '<b>'+get('flip_lost')+'</b><i>Lost</i>'+
        '<b>'+get('flip_abandoned')+'</b><i>Abandoned</i></span></h2>'+
        '<ul><li><b>Best Casual:</b> <span>'+toTime( get('flip_casual') )+'</span></li>'+
        '<li><b>Best Medium:</b> <span>'+toTime( get('flip_medium') )+'</span></li>'+
        '<li><b>Best Hard:</b> <span>'+toTime( get('flip_hard') )+'</span></li></ul>'+
        '<ul><li><b>Total Flips:</b> <span>'+parseInt( ( parseInt(get('flip_matched')) + parseInt(get('flip_wrong')) ) * 2)+'</span></li>'+
        '<li><b>Matched Flips:</b> <span>'+get('flip_matched')+'</span></li>'+
        '<li><b>Wrong Flips:</b> <span>'+get('flip_wrong')+'</span></li></ul></div>');

    };

    function updateScore(score) {
      const scoreEl = document.querySelector('#score');
      scoreEl.textContent = score;
    }

    async function saveScore(score) {
      const userName = getPlayerName();
      const newScore = { name: userName, score: score };
  
      try {
          const response = await fetch('/api/score', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(newScore),
          });
  
          // Store what the service gave as the high scores
          const scores = await response.json();
          localStorage.setItem('scores', JSON.stringify(scores));
  
          // Send WebSocket message for game end
          broadcastEvent('player', 'gameEnd', { score: score });
      } catch {
          // If there was an error then just track scores locally
          updateScoresLocal(newScore);
      }
  }

  function updateScoresLocal(newScore) {
    let scores = [];
    const scoresText = localStorage.getItem('scores');
    if (scoresText) {
      scores = JSON.parse(scoresText);
    }

    let found = false;
    for (const [i, prevScore] of scores.entries()) {
      if (newScore > prevScore.score) {
        scores.splice(i, 0, newScore);
        found = true;
        break;
      }
    }

    if (!found) {
      scores.push(newScore);
    }

    if (scores.length > 10) {
      scores.length = 10;
    }

    localStorage.setItem('scores', JSON.stringify(scores));
  }
  

    function shuffle(array) {
      var currentIndex = array.length, temporaryValue, randomIndex;
      while (0 !== currentIndex) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          temporaryValue = array[currentIndex];
          array[currentIndex] = array[randomIndex];
          array[randomIndex] = temporaryValue;
      }
      return array;
    };
  
    function startScreen(text){
      $('#g').removeAttr('class').empty();
      $('.logo').fadeIn(250);
  
      $('.c1').text(text.substring(0, 1));
      $('.c2').text(text.substring(1, 2));
      $('.c3').text(text.substring(2, 3));
      $('.c4').text(text.substring(3, 4));
  
      // If won game
      if(text == 'nice'){
        increase('flip_won');
        decrease('flip_abandoned');
      }
  
      // If lost game
      else if(text == 'fail'){
        increase('flip_lost');
        decrease('flip_abandoned');
      }
  
      // Update stats and Leadeboard
      updateStats();
    };
  
    /* LOAD GAME ACTIONS */
  
    // Init localStorage
    if( !get('flip_won') && !get('flip_lost') && !get('flip_abandoned') ){
      //Overall Game stats
      set('flip_won', 0);
      set('flip_lost', 0);
      set('flip_abandoned', 0);
      //Best times
      set('flip_casual', '-:-');
      set('flip_medium', '-:-');
      set('flip_hard', '-:-');
      //Cards stats
      set('flip_matched', 0);
      set('flip_wrong', 0);
    }
  
    // Fill stats
    if( get('flip_won') > 0 || get('flip_lost') > 0 || get('flip_abandoned') > 0) {updateStats();}
  
 // Toggle start screen cards
$(document).on('click', '.logo .card:not(".twist")', function(e) {
  console.log('Card clicked');
  $(this).toggleClass('active').siblings().not('.twist').removeClass('active');
  if ($(e.target).is('.playnow')) { $('.logo .card').last().addClass('active'); }
});

    // Start game
    $('.play').on('click', function(){
      increase('flip_abandoned');
          $('.info').fadeOut();
  
      var difficulty = '',
          timer      = 1000,
          level      = $(this).data('level');

          console.log('Play init');
  
      // Set game timer and difficulty   
      if     (level ==  8) { difficulty = 'casual'; timer *= level * 4; }
      else if(level == 18) { difficulty = 'medium'; timer *= level * 5; }
      else if(level == 32) { difficulty = 'hard';   timer *= level * 6; }
      
      console.log('Timer and difficulty set');
  
      $('#g').addClass(difficulty);


      console.log('Before Cards created');
      $('.logo').fadeOut(250, function(){
        var startGame  = $.now(),
            obj = [];
  
        // Create and add shuffled cards to game
        for(i = 0; i < level; i++) { obj.push(i); }
  
        var shu      = shuffle( $.merge(obj, obj) ),
            cardSize = 100/Math.sqrt(shu.length);
  
        for(i = 0; i < shu.length; i++){
          var code = shu[i];
          if(code < 10) code = "0" + code;
          if(code == 30) code = 10;
          if(code == 31) code = 21;
          $('<div class="card" style="width:'+cardSize+'%;height:'+cardSize+'%;">'+
              '<div class="flipper"><div class="f"></div><div class="b" data-f="&#xf0'+code+';"></div></div>'+
            '</div>').appendTo('#g');

        }
        console.log('Cards created');

        
  
        // Set card actions
        $('#g .card').on({
          'mousedown' : function(){
            if($('#g').attr('data-paused') == 1) {return;}
            var data = $(this).addClass('active').find('.b').attr('data-f');
  
            if( $('#g').find('.card.active').length > 1){
              setTimeout(function(){
                var thisCard = $('#g .active .b[data-f='+data+']');
  
                if( thisCard.length > 1 ) {
                  thisCard.parents('.card').toggleClass('active card found').empty(); //yey
                  increase('flip_matched');
  
                  // Win game
                  if( !$('#g .card').length ){
                    var time = $.now() - startGame;
                    if( get('flip_'+difficulty) == '-:-' || get('flip_'+difficulty) > time ){
                      set('flip_'+difficulty, time); // increase best score
                    }
  
                    startScreen('nice');

                    if (difficulty == 'casual'){
                      saveScore(time);
                      updateScore();
                    }
                  }
                }
                else {
                  $('#g .card.active').removeClass('active'); // fail
                  increase('flip_wrong');
                }
              }, 401);
            }
          }
        });
  
        // Add timer bar
        $('<i class="timer"></i>')
          .prependTo('#g')
          .css({
            'animation' : 'timer '+timer+'ms linear'
          })
          .one('webkitAnimationEnd oanimationend msAnimationEnd animationend', function(e) {
            startScreen('fail'); // fail game
          });

          console.log('Timer bar added');
  
        // Set keyboard (p)ause and [esc] actions
        $(window).off().on('keyup', function(e){
          // Pause game. (p)
          if(e.keyCode == 80){
            if( $('#g').attr('data-paused') == 1 ) { //was paused, now resume
              $('#g').attr('data-paused', '0');
              $('.timer').css('animation-play-state', 'running');
              $('.pause').remove();
            }
            else {
              $('#g').attr('data-paused', '1');
              $('.timer').css('animation-play-state', 'paused');
              $('<div class="pause"></div>').appendTo('body');
            }
          }
          // Abandon game. (ESC)
          if(e.keyCode == 27){
            startScreen('flip');
            // If game was paused
            if( $('#g').attr('data-paused') == 1 ){
              $('#g').attr('data-paused', '0');
              $('.pause').remove();
            }
            $(window).off();
          }
        });
      });
    });

  });
