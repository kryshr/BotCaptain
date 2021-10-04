const { ComponentDialog, TextPrompt, WaterfallDialog, DialogTurnStatus} = require('botbuilder-dialogs');
const { CardFactory } = require('botbuilder');
const taskId = 'taskDialog';
const jsonfile = require('jsonfile');

//Prompt for Task
const { TaskPrompt } = require('./prompts/taskPrompt');
const GET_TASK_PROMPT = 'taskPrompt';
//Prompt for Student
// const { StudentPrompt } = require('./prompts/studentPrompt');
// const GET_STUDENT_PROMPT = 'studentPrompt';
const TaskCard = require('./cards/TaskCard.json');


class AssignDialog extends ComponentDialog {
    
    constructor(id){
        super(id);
        this.initialDialogId = taskId;

        this.addDialog(new TextPrompt('textPrompt'));

        this.addDialog(new WaterfallDialog(taskId, [
            this.promptForTask.bind(this),
            this.captureTask.bind(this),
            this.buildCard.bind(this),
            this.showCardStep.bind(this),
            this.captureStudent.bind(this),
            this.recordVote.bind(this)
         ]));

         //Add Prompts
         //GET_TASK_PROMPT Will validate user tasks
         this.addDialog(new TaskPrompt(GET_TASK_PROMPT));

    }

    async promptForTask(step){
        step.values.task = {};
        step.values.profile = {};
        step.values.profile = step.options.profile;
        var tasks = jsonfile.readFileSync(`./Resources/Classes/${step.values.profile.class}/Teams/${step.values.profile.team}/tasks.json`);
        let task_list = Object.keys(tasks);
        return await step.prompt(GET_TASK_PROMPT, 'What task would you like to see?',task_list);
    }

    async captureTask(step){;
        var tasks = jsonfile.readFileSync(`./Resources/Classes/${step.values.profile.class}/Teams/${step.values.profile.team}/tasks.json`);
        step.values.task_id = step.result.value;
        step.values.task = tasks[`${step.result.value}`]
        return await step.next();
    }

    async buildCard(step){
        var task = step.values.task;
        var task_id = step.values.task_id
        var profiles = jsonfile.readFileSync(`Resources/Classes/${step.values.profile.class}/profiles.json`);
        TaskCard["body"][0].id = task_id;
        TaskCard["body"][3].text = task.description;
        let profiles_list = Object.keys(profiles);
        
        
        for (var user in profiles_list){

            var choices = TaskCard["body"][5].choices
            let equal = step.values.profile.team == profiles[profiles_list[user]].team;
            if(equal == true){
                choices[user] = {"title": "", "value": ""};
                choices[user].title = profiles[profiles_list[user]].nick;  
                choices[user].value = profiles[profiles_list[user]].nick;
            }
      
            
        }


        return await step.next();
    }

    async showCardStep(step) {
        await step.context.sendActivity({
            attachments: [
                this.createAdaptiveCard()
            ],
        });
        return { status: DialogTurnStatus.waiting };
    }

    async captureStudent(step){
        console.dir(step.context.activity.value);
        step.values.vote = step.context.activity.value;
        return await step.next();
    }

    async recordVote(step){

        var votePath = `Resources/Classes/${step.values.profile.class}/Teams/${step.values.profile.team}/votes.json`;
        var votes = jsonfile.readFileSync(votePath);
        let student = step.values.vote.leaderSelection;
        let leaderVoteObject = {votes:0};
        let voteTaskId = votes[`${step.values.task_id}`];
        

        if(voteTaskId != undefined && voteTaskId[`${student}`] != undefined){
            voteTaskId[`${student}`].votes = voteTaskId[`${student}`].votes + 1; 
            jsonfile.writeFileSync(votePath, votes, {flags:'w'});

        } else if(voteTaskId != undefined && voteTaskId[`${student}`] === undefined) {
            leaderVoteObject.votes = 1;
            voteTaskId[`${student}`] = leaderVoteObject;
            console.dir(votes);
            jsonfile.writeFileSync(votePath, votes, {flags:'w'});

        } else {

            votes[`${step.values.task_id}`] = {};
            leaderVoteObject.votes = 1;
            votes[`${step.values.task_id}`][`${student}`] = leaderVoteObject;
            console.dir(votes);
            jsonfile.writeFileSync(votePath, votes, {flags:'w'});

        }
        return await step.endDialog();
    }
   
    
    createAdaptiveCard() {
        return CardFactory.adaptiveCard(TaskCard);
    }



}


exports.AssignDialog=AssignDialog;