const SERVER_URL = "https://bennieslab-backend.onrender.com";
const MAX_LIST_ITEMS = 5;

async function getUserData() {
    try {
        let response = await fetch(`${SERVER_URL}/api/v1/users/email/Bensonmusonda12@gmail.com`);

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
            throw new Error(`HTTP error. Status: ${response.status}`);
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
            throw new Error(`HTTP error. Status: ${response.status}`);
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
            throw new Error(`HTTP error. Status: ${response.status}`);
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
            educationEntry.classList.add(".education-entry");

            let educationTitleElement = document.createElement('span');
            let institutionElement = document.createElement("span");
            let levelElement = document.createElement("span");
            let dateElement = document.createElement("span");

            educationTitleElement.classList.add("education-title");
            institutionElement.classList.add("institution-element");
            levelElement.classList.add("level-element");
            dateElement.classList.add("date");

            educationTitleElement.textContent = education.title + " - ";
            institutionElement.textContent = education.institution;
            levelElement.textContent = education.level + " ";

            let formattedDateStarted = "";
            let formattedDateEnded = "";

            // Normalize a date (ISO string "2022-01-15" or legacy array
            // [2022, 1, 15]) into [year, month, day] so both formats work.
            const toYmd = (value) => {
                if (typeof value === 'string') {
                    // "2022-01-15" or "2022-01-15T10:24:27"
                    const parts = value
                        .replace('T', ' ')
                        .split(/[-:. ]/)
                        .map(Number);
                    return [parts[0], parts[1], parts[2]];
                }
                if (Array.isArray(value)) {
                    return [value[0], value[1], value[2]];
                }
                return null;
            };

            const startYmd = toYmd(education.dateStarted);
            if (startYmd) {
                formattedDateStarted = `${String(startYmd[2]).padStart(2, '0')} - ${String(startYmd[1]).padStart(2, '0')} - ${String(startYmd[0]).slice(-2)}`;
            }

            const endYmd = toYmd(education.dateEnded);
            if (endYmd) {
                formattedDateEnded = `${String(endYmd[2]).padStart(2, '0')} - ${String(endYmd[1]).padStart(2, '0')} - ${String(endYmd[0]).slice(-2)}`;
            } else if (education.currentlyHere) {
                formattedDateEnded = "Present";
            }

            if (formattedDateStarted && formattedDateEnded) {
                dateElement.textContent = `${formattedDateStarted} to ${formattedDateEnded}`;
            } else if (formattedDateStarted) {
                dateElement.textContent = formattedDateStarted;
            } else if (formattedDateEnded) {
                dateElement.textContent = formattedDateEnded;
            } else {
                dateElement.textContent = "";
            }

            const lineBreak = document.createElement("br");
            educationEntry.appendChild(educationTitleElement);
            educationEntry.appendChild(institutionElement);
            educationEntry.appendChild(document.createElement("br"));
            educationEntry.appendChild(levelElement);
            educationEntry.appendChild(lineBreak);
            educationEntry.appendChild(dateElement);
            educationDiv.appendChild(educationEntry);
        });
    }
    catch(error) {
        console.error("error displaying education details. error:", error)
    }
}

async function fetchSkills() {
    try {
        let response = await fetch(`${SERVER_URL}/skills`)
        let skillsData = await response.json();

        if(!response.ok) {
            throw new Error(`HTTP error. Status: ${response.status}`);
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
            throw new Error(`HTTP error. Status: ${response.status}`);
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