// function to calculate the result of the survey
function tabulateAnswers() {
    // initialize variables for each choice's score
    // If you add more choices and outcomes, you must add another variable here.
    var c1score = 0;
    var c2score = 0;
    var c3score = 0;
    var c4score = 0;
    
    // get a list of the radio inputs on the page
    var choices = document.getElementsByTagName('input');
    // loop through all the radio inputs
    for (i=0; i<choices.length; i++) {
      // if the radio is checked..
      if (choices[i].checked) {
        // add 1 to that choice's score
        if (choices[i].value == 'c1') {
          c1score = c1score + 1;
        }
        if (choices[i].value == 'c2') {
          c2score = c2score + 1;
        }
        if (choices[i].value == 'c3') {
          c3score = c3score + 1;
        }
        if (choices[i].value == 'c4') {
          c4score = c4score + 1;
        }
      }
    }
    
    // Find out which choice got the highest score.
    // If you add more choices and outcomes, you must add the variable here.
    var maxscore = Math.max(c1score,c2score,c3score,c4score);
    
    // Display answer corresponding to that choice
    //var answerbox = document.getElementById('answer');
    if (c1score == maxscore) { // If user chooses the first choice the most, this outcome will be displayed.
      console.log("אתה ימיני- בחר במחל.");
      //answerbox.innerHTML = "אתה ימיני- בחר במחל.";
      $('#candidatesSelect').val(1);
    }
    if (c2score == maxscore) { // If user chooses the second choice the most, this outcome will be displayed.
      //answerbox.innerHTML = "אתה מרכז- המחנה הממלכתי";
      console.log("אתה מרכז- המחנה הממלכתי");
      $('#candidatesSelect').val(2);
    }
    if (c3score == maxscore) { // If user chooses the third choice the most, this outcome will be displayed.
      //answerbox.innerHTML = "אתה שמאל-העבודה תהיה הבחירה הנכונה";
      $('#candidatesSelect').val(3);
    }
    if (c4score == maxscore) { // If user chooses the fourth choice the most, this outcome will be displayed.
      //answerbox.innerHTML = "אתה נוטה לימין מרכז- יש עתיד";
      $('#candidatesSelect').val(4);
    }

    

  }
  
  // program the reset button
  function resetAnswer() {
    var answerbox = document.getElementById('answer');
    answerbox.innerHTML = "הבחירה הנכונה תופיע פה";
  }

  function submitAnnonimousVote(){
    tabulateAnswers();
    var res = confirm('האם אתה בטוח שברצונך להצביע בצורה אנונימית?');
    if(res){
      App.castVote();
      location.href = "index.html";
    }
    return false;
  }