//============================
//--- KYC form
//=============================


var currentTab = 0; // Current tab is set to be the first tab (0)
showTab(currentTab); // Display the current tab

function showTab(n) {
    // This function will display the specified tab of the form...
    var x = document.getElementsByClassName("step");
    x[n].style.display = "block";
    //... and fix the Previous/Next buttons:
    if (n == 0) {
        document.getElementById("prevBtn").style.display = "none";
    } else {
        document.getElementById("prevBtn").style.display = "inline";
    }
    if (n == (x.length - 1)) {
        document.getElementById("nextBtn").innerHTML = "Submit";
    } else {
        document.getElementById("nextBtn").innerHTML = "Next";
    }
    //... and run a function that will display the correct step indicator:
    fixStepIndicator(n)
}

function nextPrev(n) {
    var x = document.getElementsByClassName("step");

    // Check if the user is logged in by checking for the token
    const token = localStorage.getItem('token');
    if (!token) {
        alert('You must be logged in to proceed');
        return false;
    }

    // Exit the function if any field in the current tab is invalid:
    if (n == 1 && !validateForm()) return false;

    // Hide the current tab:
    x[currentTab].style.display = "none";

    // Increase or decrease the current tab by 1:
    currentTab = currentTab + n;

    // if you have reached the end of the form...
    if (currentTab >= x.length) {
        // ... the form gets submitted:
        document.getElementById("kycForm").submit();
        return false;
    }

    // Otherwise, display the correct tab:
    showTab(currentTab);
}

function validateForm() {
    var x, y, i, valid = true;
    x = document.getElementsByClassName("step");
    y = x[currentTab].getElementsByTagName("input");

    // A loop that checks every input field in the current tab:
    for (i = 0; i < y.length; i++) {
        // If the field is not the nid-number field and is empty...
        if (y[i].name !== 'nid-number' && y[i].value == "") {
            // add an "invalid" class to the field:
            y[i].className += " invalid";
            // and set the current valid status to false
            valid = false;
        } else {
            // Remove the invalid class if the field is valid
            y[i].classList.remove("invalid");
        }
    }

    // If the valid status is true, mark the step as finished and valid:
    if (valid) {
        document.getElementsByClassName("stepIndicator")[currentTab].className += " finish";
    }

    return valid; // return the valid status
}


document.getElementById('kycForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);
    const token = localStorage.getItem('token');

    if (!token) {
        alert('You must be logged in to upload documents');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/upload', {
            method: 'POST',
            headers: {
                'x-auth-token': token
            },
            body: formData
        });

        if (response.ok) {
            alert('Documents uploaded successfully');
        } else {
            const errorText = await response.text();
            console.error('Upload failed:', errorText);
            alert('Failed to upload documents: ' + errorText);
        }
    } catch (error) {
        console.error('Error uploading documents:', error);
        alert('An error occurred');
    }
});

function fixStepIndicator(n) {
    // This function removes the "active" class of all steps...
    var i, x = document.getElementsByClassName("stepIndicator");
    for (i = 0; i < x.length; i++) {
        x[i].className = x[i].className.replace(" active", "");
    }
    //... and adds the "active" class on the current step:
    x[n].className += " active";
}