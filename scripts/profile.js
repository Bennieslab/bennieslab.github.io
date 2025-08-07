const SERVER_URL = "https://bennieslab-backend.onrender.com";
const MAX_LIST_ITEMS = 5;

async function getUserData() {
    try {
        let response = await fetch(`${SERVER_URL}/api/v1/users/email/bennieboyy101@gmail.com`);

        if(!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        let userData = await response.json();
        return userData;
    } catch(error) {
        console.error("Error fetching data: ", error);
        throw error;
    }
}

async function displayUserData() {
    let identity = document.querySelector(".identity");

    try {
        let user = await getUserData();

        let username = document.createElement("h1");
        let career = document.createElement("h2");

        username.classList.add("username");
        career.classList.add("career");
        
        username.textContent = user.firstName + " " + user.lastName;
        career.textContent = user.career;

        identity.appendChild(username);
        identity.appendChild(career);
    } catch(error) {
        console.error("Failed to fetch user data: ", error)
    }
}

async function fetchProjects() {
    try {
        let response = await fetch(`${SERVER_URL}/projects/names`);
        let projectsData = await response.json();

        if(!response.ok) {
            throw new Error("HTTP Error.Status: ", error);
        }

        return projectsData;
    }
    catch(error) {
        console.error("Error fetching projects.", error);
    }
}

async function displayProjects() {
    let projectsDiv = document.querySelector(".projects");

    try {
        let projects = await fetchProjects();
        const limitedProjects = projects.slice(0, MAX_LIST_ITEMS);

        limitedProjects.forEach(project => {
            let projectName = document.createElement("p");
            projectName.classList.add("project");
            projectName.textContent = project.name;
            projectsDiv.appendChild(projectName);
        });
    }
    catch(error) {
        console.error("Error displaying projects.", error);
    }
}

async function fetchExperience() {
    try {
        let response = await fetch(`${SERVER_URL}/experience`);
        let experienceData = await response.json();

        if(!response.ok) {
            throw new Error("HTTP Error.Status: ", error);
        }

        return experienceData;
    }
    catch(error) {
        console.error("Error fetching experience.", error);
    }
}

async function displayExperience() {
    let experienceDiv = document.querySelector(".experience");

    try {
        let experience = await fetchExperience();
        const limitedExperience = experience.slice(0, MAX_LIST_ITEMS);

        limitedExperience.forEach(exp => {
            let exp_entry = document.createElement("p");
            exp_entry.classList.add("worked_at");
            exp_entry.textContent = `${exp.position} at ${exp.organization}`;
            experienceDiv.appendChild(exp_entry);
        });
    }
    catch(error) {
        console.error("Error displaying experience.", error);
    }
}

async function fetchEducation() {
    try {
        let response = await fetch(`${SERVER_URL}/education`);
        let educationData = await response.json();

        if(!response.ok) {
            throw new Error("HTTP error. Status: ", error);
        }

        return educationData;
    }
    catch(error) {
        console.error("Error fetching education details. error:", error);
    }
}

async function displayEducation() {
    let educationDiv = document.querySelector(".education");

    try {
        let educationData = await fetchEducation();
        const limitedEducation = educationData.slice(0, MAX_LIST_ITEMS);

        limitedEducation.forEach(education => {
            let educationEntry = document.createElement("div");
            educationEntry.classList.add("education-entry");

            let educationTitleAndInstitution = document.createElement("p");
            educationTitleAndInstitution.classList.add("education-title-institution");
            educationTitleAndInstitution.textContent = `${education.title} - ${education.institution}`;
            
            let levelAndDate = document.createElement("p");
            levelAndDate.classList.add("education-level-date");
            
            let formattedDateStarted = "";
            let formattedDateEnded = "";

            if (education.dateStarted) {
                let fDStart = new Date(education.dateStarted[0], education.dateStarted[1] - 1, education.dateStarted[2]);
                let monthS = String(fDStart.getMonth() + 1).padStart(2, '0');
                let yearS = String(fDStart.getFullYear());
                formattedDateStarted = `${monthS}/${yearS}`;
            }

            if (education.dateEnded) {
                let fDEnd = new Date(education.dateEnded[0], education.dateEnded[1] - 1, education.dateEnded[2]);
                let monthE = String(fDEnd.getMonth() + 1).padStart(2, '0');
                let yearE = String(fDEnd.getFullYear());
                formattedDateEnded = `${monthE}/${yearE}`;
            } else if (education.currentlyHere) {
                formattedDateEnded = "Present";
            }
            
            let dateRange = "";
            if (formattedDateStarted && formattedDateEnded) {
                dateRange = `${formattedDateStarted} - ${formattedDateEnded}`;
            } else if (formattedDateStarted) {
                dateRange = formattedDateStarted;
            } else if (formattedDateEnded) {
                dateRange = formattedDateEnded;
            }

            levelAndDate.textContent = `${education.level} | ${dateRange}`;

            educationEntry.appendChild(educationTitleAndInstitution);
            educationEntry.appendChild(levelAndDate);
            
            educationDiv.appendChild(educationEntry);
        });
    } catch(error) {
        console.error("error displaying education details. error:", error);
    }
}

async function fetchSkills() {
    try {
        let response = await fetch(`${SERVER_URL}/skills`)
        let skillsData = await response.json();

        if(!response.ok) {
            throw new error("HTTP error. Status: ", error);
        }

        return skillsData;
    }
    catch(error) {
        console.error("Error fetching skills details. error:", error);
    }
}

async function displaySkills() {
    let skillsDiv = document.querySelector(".skills");

    try {
        let skillsData = await fetchSkills();
        const limitedSkills = skillsData.slice(0, MAX_LIST_ITEMS);

        limitedSkills.forEach(skill => {
            let skillElement = document.createElement("p");
            skillElement.classList.add("skill-element");
            skillElement.textContent = skill.name;
            skillsDiv.appendChild(skillElement);
        });
    }
    catch(error) {
        console.error("error displaying skills");
    }
}

async function fetchCertification() {
    try {
        let response = await fetch(`${SERVER_URL}/certificate`)
        let certificationData = await response.json();

        if(!response.ok) {
            throw new error("HTTP error. Status: ", error);
        }

        return certificationData;
    }
    catch(error) {
        console.error("Error fetching skills details. error:", error);
    }
}

async function displayCertification() {
    let certificationDiv = document.querySelector(".certification");

    try {
        let certificationData = await fetchCertification();
        const limitedCertification = certificationData.slice(0, MAX_LIST_ITEMS);

        limitedCertification.forEach(certificate => {
            let certificateElement = document.createElement("p");
            certificateElement.classList.add("certificate-element");
            certificateElement.textContent = certificate.name + " from " + certificate.source;
            certificationDiv.appendChild(certificateElement);
        });
    }
    catch(error) {
        console.error("error displaying skills");
    }
}

displayUserData();
displayProjects();
displayExperience();
displayEducation();
displaySkills();
displayCertification();