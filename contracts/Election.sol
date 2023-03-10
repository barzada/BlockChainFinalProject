pragma solidity >=0.5.0;

import "./DappToken.sol";

contract Election {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    DappToken public tokensContract;

    bool public isWindowSet = false;
    uint256 public votingWindowStart;
    uint256 public votingWindowEnd;

    // Accounts that have voted
    mapping(address => bool) public voters;

    // Read/write candidates
    mapping(uint256 => Candidate) public candidates;

    mapping(address => bool) public allowedVoters;

    // Candidates Count
    uint256 public candidatesCount;

    address public owner;

    event votedEvent(uint256 indexed _candidateId);

    constructor(DappToken _tokensContract) public {
        tokensContract = _tokensContract;
        owner = msg.sender;
        addCandidate("Licud");
        addCandidate("Haavoda");
        addCandidate("Hmahane hammlachti");
        addCandidate("Yesh Atid");
    }

    modifier onlyOwner() {
        require(msg.sender == owner);
        _;
    }

    function setVotingWindow(uint256 start, uint256 end) public onlyOwner {
        votingWindowStart = start;
        votingWindowEnd = end;
        isWindowSet = true;
    }

    function addCandidate(string memory _name) public onlyOwner {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function vote(uint256 _candidateId) public {
        // Require that they haven't voted before
        require(!voters[msg.sender]);

        // require a valid candidate
        require(_candidateId > 0 && _candidateId <= candidatesCount);

        // record that voter has voted
        voters[msg.sender] = true;

        // Pay the voter with Token
        // We didnt manage to make this part work. #TODO
        //getToken().transfer(msg.sender, 1);

        // Update candidate vote Count
        candidates[_candidateId].voteCount++;

        // Voted event
        emit votedEvent(_candidateId);
    }

    function getToken() public returns (DappToken add) {
        return tokensContract;
    }

    function submitAllowedVoters(address _allowedVoters) public onlyOwner {
        allowedVoters[_allowedVoters] = true;
    }
}
