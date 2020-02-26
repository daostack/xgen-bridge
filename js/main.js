window.addEventListener('load', async () => {
  if (window.ethereum) {
    window.web3 = new Web3(ethereum);
    try {
      await ethereum.enable();
    } catch (error) {
      toastr.error('An error occurred: ' + error);
    }
  } else if (window.web3) {
    window.web3 = new Web3(web3.currentProvider);
  } else {
    toastr.error('Non-Ethereum browser detected. You should consider trying MetaMask.');
    return
  }

  let network = await web3.eth.net.getNetworkType()
  if (network === 'private') {
    if (await web3.eth.net.getId() === 100) {
      network = 'xdai'
      $("#description").text('Your wallet is connected to the xDai network.\nThe direction of the bridge is xGEN to GEN')
    }
  } else if (network === 'main') {
    network = 'mainnet'
    $("#description").text('Your wallet is connected to the Ethereum mainnet network.\nThe direction of the bridge is GEN to xGEN')
  }

  
  if (network !== 'mainnet' && network !== 'xdai') {
    toastr.error('Invalid network specified (please use xDai/ mainnet).')
    $("#description").text('No web3 provider detected...')
    return
  }

  const GENTokenContract = await new web3.eth.Contract(
    [
      {
        "constant": true,
        "inputs": [
          {
            "name": "owner",
            "type": "address"
          }
        ],
        "name": "balanceOf",
        "outputs": [
          {
            "name": "",
            "type": "uint256"
          }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
      }
    ],
    '0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf',
    {}
  )

  let genBalance = web3.utils.fromWei(await GENTokenContract.methods.balanceOf((await web3.eth.getAccounts())[0]).call())
  $("#balance").text("Your token balance is " + genBalance)


  $("#form").submit(function(event) {
    event.preventDefault();
    let xgenToMove = parseInt(document.getElementById("amount").value);
    if (isNaN(xgenToMove)) {
      alert('Invalid amount of tokens.');
      return;
    }
    moveGEN(xgenToMove);
  })
});


async function moveGEN (xgenToMove) {
  let defaultAddress = (await web3.eth.getAccounts())[0];
  
  let opts = {
    from: defaultAddress
  }

  let weiValue = web3.utils.toWei(xgenToMove.toString())

  let bridgeAddress

  let network = await web3.eth.net.getNetworkType()
  if (network === 'private') {
    if (await web3.eth.net.getId() === 100) {
      network = 'xdai'
    }
  } else if (network === 'main') {
    network = 'mainnet'
  }

  if (network === 'mainnet') {
    bridgeAddress = '0x6eA6C65E14661C0BcaB5bc862fE5E7D3B5630C2F'
    txMsg = ' GEN tokens to the xDai chain'
  } else if (network === 'xdai') {
    bridgeAddress = '0xe47097ceF3B0bcbb0095A21523714bF0022E2DB8'
    txMsg = ' xGEN tokens to the Ethereum mainnet chain'
  } else {
    console.error('Invalid network specified (please use xDai/ mainnet).')
    return
  }

  let callInterface = {
    'constant': false,
    'inputs': [
      { 'name': '_from', 'type': 'address' },
      { 'name': '_value', 'type': 'uint256' },
      { 'name': '_data', 'type': 'bytes' }
    ],
    'name': 'onTokenTransfer',
    'outputs': [{ 'name': '', 'type': 'bool' }],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
  }

  let callData = web3.eth.abi.encodeFunctionCall(callInterface, [
    defaultAddress,
    weiValue,
    '0x'
  ])

  const GENTokenContract = await new web3.eth.Contract(
    [
      { 'constant': false,
        'inputs': [
          { 'name': '_to', 'type': 'address' },
          { 'name': '_value', 'type': 'uint256' },
          { 'name': '_data', 'type': 'bytes' }
        ],
        'name': 'transfer',
        'outputs': [{ 'name': '', 'type': 'bool' }],
        'payable': false,
        'stateMutability': 'nonpayable',
        'type': 'function' }
    ],
    '0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf',
    opts
  )
  await GENTokenContract.methods.transfer(bridgeAddress, weiValue, callData).send()

  toastr.info('Transaction was mined successfully. The tokens will be in your account in a few blocks.')
}