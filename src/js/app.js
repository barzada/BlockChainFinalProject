App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    hasVoted: false,


    init: function() {
        return App.initWeb3();
    },

    initWeb3: async function() {
        if (window.ethereum) {
          App.web3Provider = window.ethereum;
          try {
            // Request account access
            await window.ethereum.enable();
          } catch (error) {
            // User denied account access...
            console.error("User denied account access")
          }
        }
        // Legacy dapp browsers...
        else if (window.web3) {
          App.web3Provider = window.web3.currentProvider;
        }
        // If no injected web3 instance is detected, fall back to Ganache
        else {
          App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
        }
        web3 = new Web3(App.web3Provider);
    
        return App.initContract();
      },

    initContract: function() {
        $.getJSON("DappToken.json", function(DappToken) {
            // Instantiate a new truffle contract from the artifact
            App.contracts.DappToken = TruffleContract(DappToken);
            // Connect provider to interact with contract
            App.contracts.DappToken.setProvider(App.web3Provider);

            $.getJSON("Election.json", function(election) {
                // Instantiate a new truffle contract from the artifact
                App.contracts.Election = TruffleContract(election);
                // Connect provider to interact with contract
                App.contracts.Election.setProvider(App.web3Provider);

                App.listenForEvents();

                return App.render();
            });
        });

    },

    // Listen for events emitted from the contract
    listenForEvents: function() {
        App.contracts.Election.deployed().then(function(instance) {

            instance.votedEvent({}, {
                fromBlock: 0,
                toBlock: 'latest'
            }).watch(function(error, event) {
                console.log("event triggered", event)
                    // Reload when a new vote is recorded
                    //App.render();
            });
        });

    },

    render: function() {
        var electionInstance;
        var loader = $("#loader");
        var content = $("#content");
        var adminDashboard = $("#admin-dashboard");
        var votingDisabledWarning = $('#voting-disabled-warning');
        const votingEndedWarning = $('#voting-ended-message');
        const windowNotSetWarning = $('#window-not-set-warning');
        loader.show();
        content.hide();
        adminDashboard.hide();
        votingDisabledWarning.hide();
        votingEndedWarning.hide();
        windowNotSetWarning.hide();

        //  $('#submit-voters-file-input').on('change', readFile);

        // Load account data
        web3.eth.getCoinbase(function(err, account) {
            if (err === null) {
                App.account = account;
                $("#accountAddress").html("Hello " + account);
            }
        });

        App.contracts.DappToken.deployed().then(function(instance) {
            window.DappToken = instance;
            console.log("coin address = ", instance.address);
        });
        // Load contract data
        App.contracts.Election.deployed().then(function(instance) {
            electionInstance = instance;
            window.instance = instance;
            console.log("election address = ", window.instance.address);
            return electionInstance.candidatesCount();
        }).then(async function(candidatesCount) {
            var candidatesResults = $("#candidatesResults");
            candidatesResults.empty();

            var candidatesSelect = $('#candidatesSelect');
            candidatesSelect.empty();

            var candidatesPromises = [];
            for (var i = 1; i <= candidatesCount; i++) {
                candidatesPromises.push(electionInstance.candidates(i));
            }

            const candidates = await Promise.all(candidatesPromises);
            console.log(await candidates);
            candidates.sort((candidateA, candidateB) => {
                return candidateB[2] - candidateA[2];
            }).forEach((candidate, idx) => {
                var id = candidate[0];
                var name = candidate[1];
                var voteCount = candidate[2];
                var image = "<img src=\"./images/" + id + ".jpg\" width=\"60\" height=\"60\">";


                // Render candidate Result
                var candidateTemplate = "<tr><th>" + (idx + 1) + "</th><td>" + image + "</td><td><strong>" + name + "</strong></td><td>" + voteCount + "</td></tr>"
                candidatesResults.append(candidateTemplate);

                // Render candidate ballot option
                var candidateOption = "<option value='" + id + "' >" + name + "</ option>"
                candidatesSelect.append(candidateOption);
            })
            return electionInstance.voters(App.account);
        }).then(function(hasVoted) {
            // Do not allow a user to vote
            if (hasVoted) {
                $('#chooseForm').hide();
            }
            loader.hide();
            content.show();
            return electionInstance.owner()
        }).then((ownerAccount) => {
            if (ownerAccount === App.account) {
                adminDashboard.show();
            }

            return Promise.all([
                electionInstance.votingWindowStart().then((res) => res ? res.toNumber() : 0),
                electionInstance.votingWindowEnd().then((res) => res ? res.toNumber() : 0),
                electionInstance.isWindowSet()
            ]);
        }).then(([votingWindowStart, votingWindowEnd, isWindowSet]) => {
            const now = Date.now();
            const votingEnded = now >= votingWindowEnd;
            const isVotingWindowActive = now >= votingWindowStart;

            if (isWindowSet) {
                $('#set-voting-window-from').val(convertDateToLocalizedIsoString(new Date(votingWindowStart)));
                $('#set-voting-window-to').val(convertDateToLocalizedIsoString(new Date(votingWindowEnd)));
                if (isVotingWindowActive) {
                    setTimerWithTime(convertDateToLocalizedIsoString(new Date(votingWindowEnd)));
                    //timerCountDown(new Date(votingWindowEnd));
                }
                if (!isVotingWindowActive) {
                    $('#chooseForm').hide();
                    votingDisabledWarning.html(`
                Voting has not yet started, you will be able to vote between the following dates:<br/>
                ${new Date(votingWindowStart).toLocaleString()} - ${new Date(votingWindowEnd).toLocaleString()}
              `)
                    votingDisabledWarning.show()
                }
                if (votingEnded) {
                    $('#voting-ended-message').show();
                    $('#chooseForm').hide();
                    $($(candidatesResults).children('tr').get(0)).addClass('winner');
                } else {
                    $('#voting-ended-message').hide();
                }
            } else {
                windowNotSetWarning.show();
                $('#chooseForm').hide();
            }
        }).catch(function(error) {
            console.warn(error);
        });
    },
    setVotingWindow: function() {
        var fromDate = new Date($('#set-voting-window-from').val()).getTime();
        var toDate = new Date($('#set-voting-window-to').val()).getTime();

        App.contracts.Election.deployed().then(function(instance) {
            return instance.setVotingWindow(fromDate, toDate, { from: App.account }).then(() => {
                return App.render();
            });
        })
    },

    submitVotersFile: function() {
        var input = document.createElement('input');
        input.type = 'file';

        input.onchange = e => {

            // getting a hold of the file reference
            var file = e.target.files[0];

            // setting up the reader
            var reader = new FileReader();
            reader.readAsText(file, 'UTF-8');

            // here we tell the reader what to do when it's done reading...
            reader.onload = readerEvent => {
                var content = readerEvent.target.result; // this is the content!
                //console.log( content );
                readUsers(content);
            }
        }
        input.click();
    },


    addCandidate: function() {
        var candidateName = $('#new-candidate-name').val();
        App.contracts.Election.deployed().then((function(instance) {
            return instance.addCandidate(candidateName, { from: App.account })
        })).then(() => {
            return App.render();
        }).catch((function(err) {
            console.error(err);
        }))
    },

    castVote: function() {
        var candidateId = $('#candidatesSelect').val();
        App.contracts.Election.deployed().then((function(instance) {
            return instance.vote(candidateId, { from: App.account })
        })).then(() => {
            return App.render();
        }).catch((function(err) {
            console.error(err);
        }))
    }
};

$(function() {
    $(window).load(function() {
        App.init();
    });
});

function dappTokenlistenForEvent(instance) {
    $.getJSON("DappTokenSale.json", function(dappTokenSale) {
        App.contracts.DappTokenSale = TruffleContract(dappTokenSale);
        App.contracts.DappTokenSale.setProvider(App.web3Provider);
        App.contracts.DappTokenSale.deployed().then(function(dappTokenSale) {
            dappTokenSale.Sell({}, {
                fromBlock: 0,
                toBlock: 'latest',
            }).watch(function(error, event) {
                console.log("event triggered", event);

            })
            console.log("Dapp Token Sale Address:", dappTokenSale.address);
        });

    });
}

function maineEvent() {
    App.contracts.Election.deployed().then(function(instance) {

        instance.votedEvent({}, {
            fromBlock: 0,
            toBlock: 'latest'
        }).watch(function(error, event) {
            console.log("event triggered", event)
                // Reload when a new vote is recorded

        });
    });
}

function addCandidateListenToEvent() {
    $.getJSON("Election.json", function(election) {
        App.contracts.Election = TruffleContract(election);
        App.contracts.Election.setProvider(App.web3Provider);
        App.contracts.Election.deployed().then(function(election) {
            election.addCandidateEvent({}, {
                fromBlock: 0,
                toBlock: 'latest',
            }).watch(function(error, event) {
                console.log("event triggered", event);

            })
            console.log("election Address:", election.address);
        });

    })
}

function convertDateToLocalizedIsoString(date) {

    var dateString =
        date.getFullYear() + "-" +
        ("0" + (date.getMonth() + 1)).slice(-2) + "-" +
        ("0" + date.getDate()).slice(-2) + "T" +
        ("0" + date.getHours()).slice(-2) + ":" +
        ("0" + date.getMinutes()).slice(-2) + ":" +
        ("0" + date.getSeconds()).slice(-2) +
        "+0000";
    return dateString;
}

function readUsers(fileContent) {
    var splittedContent = fileContent.split('\n');
    var usersData = [];
    for (var i = 0; i < splittedContent.length; i++) {
        usersData.push(splittedContent[i]);
    }
    createDD(usersData);
    return usersData;
}

function createDD(usersData) {
    var DD = document.getElementById("selectUser");
    for (var user of usersData) {
        if (user !== "") {
            var option = document.createElement("option");
            option.text = user.substring(4, user.length);
            DD.appendChild(option);
        }
    }
    DD.style.display = "block";
    DD.addEventListener("change", function(e) {
        var dummy = document.createElement("textarea");
        // to avoid breaking orgain page when copying more words
        // cant copy when adding below this code
        // dummy.style.display = 'none'
        document.body.appendChild(dummy);
        //Be careful if you use texarea. setAttribute('value', value), which works with "input" does not work with "textarea". – Eduard
        dummy.value = e.target.value;
        dummy.select();
        document.execCommand("copy");
        document.body.removeChild(dummy);
        alert("Value copied to clipboard");
    })

}

function setTimerWithTime(endElectionTime) {
    var countDownDate = new Date(new String(endElectionTime)).getTime();

    // Update the count down every 1 second
    var x = setInterval(function() {
        var now = new Date().getTime() + 7200000;

        // Find the distance between now and the count down date
        var distance = countDownDate - now;

        // Time calculations for days, hours, minutes and seconds
        var days = Math.floor(distance / (1000 * 60 * 60 * 24));
        var hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        var minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        var seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Display the result in the element with id="demo"
        document.getElementById("timer").innerHTML = days + "d " + hours + "h " +
            minutes + "m " + seconds + "s Left to vote";

        // If the count down is finished, write some text
        if (distance < 0) {
            clearInterval(x);
            document.getElementById("timer").innerHTML = "";
            var element = document.getElementById("chooseForm");
            element.style.visibility = "hidden";
        }
    }, 1000);
}