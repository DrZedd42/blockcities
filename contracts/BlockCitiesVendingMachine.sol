pragma solidity ^0.5.0;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./generators/ColourGenerator.sol";
import "./generators/LogicGenerator.sol";

import "./FundsSplitter.sol";
import "./libs/Strings.sol";
import "./IBlockCitiesCreator.sol";

contract BlockCitiesVendingMachine is Ownable, FundsSplitter {
    using SafeMath for uint256;

    event PricePerBuildingInWeiChanged(
        uint256 _oldPricePerBuildingInWei,
        uint256 _newPricePerBuildingInWei
    );

    event PriceStepInWeiChanged(
        uint256 _oldPriceStepInWei,
        uint256 _newPriceStepInWei
    );

    event VendingMachineTriggered(
        uint256 indexed _tokenId,
        address indexed _architect
    );

    event CreditAdded(
        address indexed _to
    );

    event PriceDiscountBandsChanged(
        uint256[2] _priceDiscountBands
    );

    LogicGenerator public logicGenerator;
    ColourGenerator public colourGenerator;
    IBlockCitiesCreator public blockCities;

    mapping(address => uint256) public credits;

    uint256 public totalPurchasesInWei = 0;
    uint256[2] public priceDiscountBands = [80, 70];

    uint256 public floorPricePerBuildingInWei = 0.05 ether;
    uint256 public ceilingPricePerBuildingInWei = 0.15 ether;

    // use totalPrice() to calculate current weighted price
    uint256 internal pricePerBuildingInWei = floorPricePerBuildingInWei;

    uint256 public priceStepInWei = 0.01 ether;
    uint256 public timeStep = 1 hours;

    uint256 public lastSale = 0;

    constructor (
        LogicGenerator _logicGenerator,
        ColourGenerator _colourGenerator,
        IBlockCitiesCreator _blockCities
    ) public FundsSplitter(msg.sender, msg.sender) {

        logicGenerator = _logicGenerator;
        colourGenerator = _colourGenerator;
        blockCities = _blockCities;
    }

    function mintBuilding() public payable returns (uint256 _tokenId) {
        require(
            credits[msg.sender] > 0 || msg.value >= totalPrice(1),
            "Must supply at least the required minimum purchase value or have credit"
        );

        // use credits first
        if (credits[msg.sender] > 0) {
            credits[msg.sender] = credits[msg.sender].sub(1);
        } else {
            totalPurchasesInWei = totalPurchasesInWei.add(msg.value);
        }

        splitFunds();

        uint256 tokenId =  _generate();

        _stepIncrease();

        return tokenId;
    }

    function mintBatch(uint256 _numberOfBuildings) public payable returns (uint256[] memory _tokenIds){
        require(
            credits[msg.sender] >= _numberOfBuildings || msg.value >= totalPrice(_numberOfBuildings),
            "Must supply at least the required minimum purchase value or have credit"
        );

        // use credits first
        if (credits[msg.sender] > 0) {
            credits[msg.sender] = credits[msg.sender].sub(_numberOfBuildings);
        } else {
            totalPurchasesInWei = totalPurchasesInWei.add(msg.value);
        }

        splitFunds();

        uint256[] memory generatedTokenIds = new uint256[](_numberOfBuildings);

        for (uint i = 0; i < _numberOfBuildings; i++) {
            generatedTokenIds[i] = _generate();
        }

        _stepIncrease();

        return generatedTokenIds;
    }

    function _generate() internal returns (uint256 _tokenId) {
        (uint256 city, uint256 building, uint256 base, uint256 body, uint256 roof, uint256 special) = logicGenerator.generate(msg.sender);
        (uint256 exteriorColorway, uint256 windowColorway) = colourGenerator.generate(msg.sender);

        uint256 tokenId = blockCities.createBuilding(
            exteriorColorway,
            windowColorway,
            city,
            building,
            base,
            body,
            roof,
            special,
            msg.sender
        );

        emit VendingMachineTriggered(tokenId, msg.sender);

        return tokenId;
    }

    function _stepIncrease() internal returns (bool) {
        lastSale = block.timestamp;

        if (pricePerBuildingInWei.add(priceStepInWei) >= ceilingPricePerBuildingInWei) {
            pricePerBuildingInWei = ceilingPricePerBuildingInWei;
            return true;
        }

        pricePerBuildingInWei = pricePerBuildingInWei.add(priceStepInWei);
        return true;
    }

    function totalPrice(uint256 _numberOfBuildings) public view returns (uint256) {

        uint256 timePassed = block.timestamp - lastSale;
        uint256 calculatedBase = pricePerBuildingInWei.minus(timePassed.div(1 hours).mul(priceStepInWei));

        if (calculatedBase < floorPricePerBuildingInWei) {
            calculatedBase = floorPricePerBuildingInWei;
        }

        if (_numberOfBuildings < 5) {
            return _numberOfBuildings.mul(calculatedBase);
        }
        else if (_numberOfBuildings < 10) {
            return _numberOfBuildings.mul(calculatedBase).div(100).mul(priceDiscountBands[0]);
        }

        return _numberOfBuildings.mul(calculatedBase).div(100).mul(priceDiscountBands[1]);
    }

    function setPricePerBuildingInWei(uint256 _newPricePerBuildingInWei) public onlyOwner returns (bool) {
        emit PricePerBuildingInWeiChanged(pricePerBuildingInWei, _newPricePerBuildingInWei);

        pricePerBuildingInWei = _newPricePerBuildingInWei;

        return true;
    }

    function setPriceStepInWei(uint256 _newPriceStepInWei) public onlyOwner returns (bool) {
        emit PricePerBuildingInWeiChanged(priceStepInWei, _newPriceStepInWei);

        priceStepInWei = _newPriceStepInWei;

        return true;
    }

    function setPriceDiscountBands(uint256[2] memory _newPriceDiscountBands) public onlyOwner returns (bool) {
        priceDiscountBands = _newPriceDiscountBands;

        emit PriceDiscountBandsChanged(_newPriceDiscountBands);

        return true;
    }

    function addCredit(address _to) public onlyOwner returns (bool) {
        credits[_to] = credits[_to].add(1);

        emit CreditAdded(_to);

        return true;
    }

    function addCreditBatch(address[] memory _addresses) public onlyOwner returns (bool) {
        for (uint i = 0; i < _addresses.length; i++) {
            addCredit(_addresses[i]);
        }
    }
}
