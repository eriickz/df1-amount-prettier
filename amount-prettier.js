// ==UserScript==
// @name        Dead Frontier - Amount Prettier
// @namespace   Dead Frontier - TheKiing
// @version     1.0.2
// @author      TheKiing
// @match       *://fairview.deadfrontier.com/onlinezombiemmo/index.php?page=15
// @match       *://fairview.deadfrontier.com/onlinezombiemmo/index.php?page=35
// @description Automatically place commas in amounts as the user type, both in bank and marketplace. 
// @grant       none
// @license     MIT
// ==/UserScript==

// BUG: After entering a desired amount and clicking the "Yes" button, the amount is incorrectly changed to 1% of the value that was originally typed.
// BUG: Input cursor is moved to the start when typing but if you remove the zero that is placed automatically it don't do it.  

// CHANGELOG
// --------------------------------------------
// 1.0.1 - September 17, 2024
// - Fix: Bank actions buttons lookup on marketplace page (line 168)
// 1.0.2 - September 17, 2024
// - Fix: Prettier input isn't visible in the loading prompt when searching items or changing tabs on marketplace page.

(function() {
  "use strict";

  const $ = jQuery

  /**********************
   *                    *
   *        MAIN        *
   *       CONFIG       *
   *                    *
   **********************/

  const bankContainerId = "bankController"
  const bankInputTopPosition = "421px"
  const bankActionBtnsTopPosition = "450px"

  const marketplacePromptContainerId = "gamecontent"
  const marketplaceInputMaxValue = 9999999999
  const marketplaceInputClass = "moneyField"

  /**********************
   *                    *
   *        UTILS       *
   *      FUNCTIONS     *
   *                    *
   **********************/

  function replaceAmountWithCommas(amount) {
    return amount.toString().replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  }

  function removeCommasFromAmount(amount) {
    return amount.replace(",", "")
  }

  function createAmountPrettierInputEvent({ 
    containerId,
    inputId,
    promptInputContainerId,
    classes,
    position,
    haveMaxValue,
    isDataTypePrice,
    onInputChange,
    onEnterKeyPress, 
  }) {
    let prettierInputElement = undefined 
    let prettierInputValue = 0
    let isEnterKeyPropmtEventRecreated = false
    const prettierInput = `<input class="${classes}" min="0" type="number" ${inputId ? `id=${inputId}` : ""} ${isDataTypePrice ? "data-type='price'" : ""} ${haveMaxValue ? `max=${marketplaceInputMaxValue}` : ""} />`

    if (promptInputContainerId === undefined) {
      $(`#${containerId}`).append(prettierInput)
      $(`#${inputId}`).css(position)

      prettierInputElement = $(`#${inputId}`)
    } else {
      $(promptInputContainerId).append(prettierInput)

      const inputsTypePrice = document.querySelectorAll("input[data-type='price']")

      if (inputsTypePrice.length === 2) {
        prettierInputElement = $(inputsTypePrice[1])
        inputsTypePrice[0].remove()
      }
    }

    if (prettierInputElement !== undefined) {
      prettierInputElement.val(0)

      prettierInputElement.keyup(function(event) {
        if (event.which >= 37 && event.which <= 40) return

        if(event.which !== 13) {
          if ($(this).attr("type") === "number") {
            $(this).get(0).type = "text"
          }

          if (onInputChange !== undefined) {
            onInputChange()
          }

          $(this).val(function(_, value) {
            prettierInputValue = replaceAmountWithCommas(value)

            if (promptInputContainerId !== undefined && isEnterKeyPropmtEventRecreated === false) {
              prompt.onkeydown = null 
              isEnterKeyPropmtEventRecreated = true
            }

            return prettierInputValue 
          });
        }

        if (event.which === 13) {
          $(this).val(removeCommasFromAmount(prettierInputValue))

          if (onEnterKeyPress !== undefined) {
            onEnterKeyPress()
          }

          $(this).get(0).type = "number"
          prettierInputValue = 0
        } 
      })
    }
  }

  /**********************
   *                    *
   *        MAIN        *
   *      FUNCTIONS     *
   *                    *
   **********************/

  function loadBankInputs() {
    const depositInputId = "deposit"
    const withdrawInputId = "withdraw"

    const depositInputClasses = $(`#${depositInputId}`).attr("class") 
    const withdrawInputClasses = $(`#${withdrawInputId}`).attr("class")

    //Removing default inputs
    $(`#${depositInputId}`).remove()
    $(`#${withdrawInputId}`).remove()

    createAmountPrettierInputEvent({
      containerId: bankContainerId,
      inputId: depositInputId,
      classes: depositInputClasses,
      position: { top: bankInputTopPosition, left: "146px" },
      onEnterKeyPress: () => deposit(0)
    })

    createAmountPrettierInputEvent({
      containerId: bankContainerId,
      inputId: withdrawInputId,
      classes: withdrawInputClasses,
      position: { top: bankInputTopPosition, left: "304px" },
      onEnterKeyPress: () => withdraw(0)
    })

    const bankActionBtns = $(`#${bankContainerId} button[class="opElem"]`)
    
    if (bankActionBtns[0] !== undefined & bankActionBtns[1] !== undefined) {
      bankActionBtns[0].style.top = bankActionBtnsTopPosition 
      bankActionBtns[1].style.top = bankActionBtnsTopPosition
    }
  }

  function loadMarketplaceInputsObserver() {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        const firstAddedNode = mutation.addedNodes.item(0)

        if (firstAddedNode?.nodeName === "DIV") {
          createAmountPrettierInputEvent({
            promptInputContainerId: firstAddedNode,
            classes: marketplaceInputClass,
            haveMaxValue: true,
            isDataTypePrice: true,
            onEnterKeyPress: () => prompt.querySelector("button").click(),
            onInputChange: () => {
              $(firstAddedNode).parent().children().removeAttr("disabled")
            }
          })
        }
      })
    }) 

    return observer
  }

  function init() {
    const bankContainerElement = $(`#${bankContainerId}`)
    const marketplaceContainer = $("#inventoryHolder")

    if (bankContainerElement !== undefined) {
      //Removing deposit and withdraw buttons
      $("#dBtn").hide()
      $("#wBtn").hide()

      loadBankInputs()
    }

    if (marketplaceContainer !== undefined) {
      const marketplaceObserver = loadMarketplaceInputsObserver()
      const observerTarget = $(`#${marketplacePromptContainerId}`)[0]

      if (marketplaceContainer.html().indexOf("Loading") === -1) {
        marketplaceObserver.observe(observerTarget, { childList: true, subtree: true })
      }
    }
  }

  init()
})();
